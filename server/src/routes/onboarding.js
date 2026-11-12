const express = require('express');
const prisma = require('../config/db');
const AuditService = require('../services/auditService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/onboarding/submit
 * User submits onboarding KYC details
 */
router.post('/submit', authenticate, async (req, res) => {
  try {
    const {
      governmentIdType,
      governmentIdNumber,
      address,
      employmentStatus,
      monthlyIncome,
      sourceOfFunds,
      accountTypeDesired = 'SAVINGS'
    } = req.body;

    if (!governmentIdType || !governmentIdNumber || !address || !employmentStatus || monthlyIncome === undefined) {
      return res.status(400).json({
        success: false,
        error: 'All onboarding fields (government ID type, number, address, employment, and income) are required.'
      });
    }

    const incomeNumber = parseFloat(monthlyIncome);
    if (isNaN(incomeNumber) || incomeNumber < 0) {
      return res.status(400).json({
        success: false,
        error: 'Monthly income must be a valid positive number.'
      });
    }

    // Check if onboarding already exists
    const existing = await prisma.onboardingApplication.findUnique({
      where: { userId: req.user.id }
    });

    if (existing && existing.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Your onboarding application has already been approved.'
      });
    }

    const application = await prisma.onboardingApplication.upsert({
      where: { userId: req.user.id },
      update: {
        governmentIdType,
        governmentIdNumber: governmentIdNumber.trim(),
        address: address.trim(),
        employmentStatus,
        monthlyIncome: incomeNumber,
        sourceOfFunds: sourceOfFunds || 'SALARY',
        accountTypeDesired,
        status: 'PENDING',
        reviewNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        submittedAt: new Date()
      },
      create: {
        userId: req.user.id,
        governmentIdType,
        governmentIdNumber: governmentIdNumber.trim(),
        address: address.trim(),
        employmentStatus,
        monthlyIncome: incomeNumber,
        sourceOfFunds: sourceOfFunds || 'SALARY',
        accountTypeDesired,
        status: 'PENDING'
      }
    });

    await AuditService.log({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ONBOARDING_SUBMIT',
      resource: 'OnboardingApplication',
      resourceId: application.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'browser',
      metadata: {
        governmentIdType,
        accountTypeDesired,
        employmentStatus
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Onboarding application submitted successfully and is pending administrative review.',
      application
    });
  } catch (err) {
    console.error('[Onboarding] Error submitting KYC:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/onboarding/my-status
 * Retrieves current onboarding application status
 */
router.get('/my-status', authenticate, async (req, res) => {
  try {
    const application = await prisma.onboardingApplication.findUnique({
      where: { userId: req.user.id }
    });

    return res.status(200).json({
      success: true,
      application: application || { status: 'NOT_SUBMITTED' }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

