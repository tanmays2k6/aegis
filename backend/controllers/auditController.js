import * as auditModel from '../models/auditModel.js';

export async function getAuditLogs(req, res, next) {
  try {
    const { search } = req.query;
    const logs = await auditModel.getAllAuditLogs({ search });
    res.json({ logs });
  } catch (err) { next(err); }
}
