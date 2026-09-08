import * as complianceModel from '../models/complianceModel.js';

export async function getCompliance(req, res, next) {
  try {
    const summary = await complianceModel.getComplianceSummary();
    res.json({ compliance: summary });
  } catch (err) { next(err); }
}
