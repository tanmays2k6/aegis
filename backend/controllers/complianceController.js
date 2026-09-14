import * as complianceModel from '../models/complianceModel.js';
import * as integrityModel from '../models/integrityModel.js';

export async function getCompliance(req, res, next) {
  try {
    const summary = await complianceModel.getComplianceSummary();
    res.json({ compliance: summary });
  } catch (err) { next(err); }
}

export async function postVerifyIntegrity(req, res, next) {
  try {
    const verification = await integrityModel.verifyIntegrity();
    res.json({ success: true, verification });
  } catch (err) { next(err); }
}
