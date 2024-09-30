import prisma from '../../db.server.js';

export const loadSession = async (req, res, next) => {
  const shop = req.cookies['shop'] || req.query.shop;

  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }

  try {
    const session = await prisma.session.findUnique({ where: { id:`offline_${shop}` } });


    if (req.cookies['shop'] !== shop) {
      res.cookie('shop', shop, { httpOnly: true, secure: true, sameSite: 'None' });
    }

    if (!session) {
      return res.redirect(`/api/auth?shop=${shop}`);
    }

    req.shop = {session};
    next();
  } catch (error) {
    console.error('Error validating session:', error);
    return res.status(500).send('Error validating session');
  }
};
