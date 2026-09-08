import * as authModel from '../models/authModel.js';

export async function postSignUp(req, res, next) {
  try {
    const { email, password, fullName, badgeNumber, jurisdiction, department } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    // Public registration must never be able to assign a privileged role.
    const data = await authModel.signUp({ email, password, fullName, role: 'investigating_officer', badgeNumber, jurisdiction, department });
    res.status(201).json({ user: data.user, message: 'Account created successfully.' });
  } catch (err) {
    err.status = 400;
    next(err);
  }
}

export async function postSignIn(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const data = await authModel.signIn({ email, password });
    const profile = await authModel.getProfile(data.user.id);
    res.json({ session: data.session, user: data.user, profile });
  } catch (err) {
    err.status = 401;
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const profile = await authModel.getProfile(req.auth.user.id);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}
