const express = require('express');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin Init usando variáveis de ambiente
admin.initializeApp({
  credential: admin.credential.cert({
    type: 'service_account',
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: 'https://accounts.google.com/o/oauth2/auth',
    tokenUri: 'https://oauth2.googleapis.com/token',
    authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
    clientC509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
  }),
});
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY);

const db = admin.firestore();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const { currentStatus, client, product } = req.body;

  if (currentStatus !== 'paid') {
    return res.status(200).json({ message: 'Ignorado: status não é pago' });
  }

  let document = client?.document || client?.cpf_cnpj;
  const productName = product?.name?.toLowerCase();

  if (!document || !productName) {
    return res.status(400).json({ error: 'Documento ou nome do produto ausente' });
  }

  document = document.replace(/[^\d]/g, '');

  let daysToAdd = 0;
  if (productName === 'finance 30') {
    daysToAdd = 30;
  } else if (productName === 'finance 180') {
    daysToAdd = 180;
  } else if (productName === 'finance 365') {
    daysToAdd = 365;
  } else {
    return res.status(400).json({ error: 'Produto inválido' });
  }

  try {
    const userQuery = await db.collection('users')
      .where('profile.cpf', '==', document)
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.log(`❌ Usuário com documento ${document} não encontrado.`);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    let currentExpirationDate = new Date();
    if (userData.accessExpirationDate) {
      const parsedDate = new Date(userData.accessExpirationDate);
      if (!isNaN(parsedDate)) {
        currentExpirationDate = parsedDate;
      }
    }

    const newExpirationDate = new Date(currentExpirationDate);
    newExpirationDate.setDate(newExpirationDate.getDate() + daysToAdd);

    const currentDuration = userData.accessDuration || 0;
    const secondsToAdd = daysToAdd * 24 * 60 * 60;

    await userDoc.ref.update({
      accessExpirationDate: newExpirationDate.toISOString(),
      accessDuration: currentDuration + secondsToAdd,
    });

    await db.collection('payments').add({
      cpf: userData.profile?.cpf || null,
      username: userData.username || null,
      document: document,
      phone: userData.profile?.phone || null,
      product: productName,
      status: currentStatus,
      transactionDate: admin.firestore.Timestamp.now(),
    });

    console.log(`✅ Acesso estendido (${daysToAdd} dias) para ${document} até ${newExpirationDate.toISOString()}`);
    res.status(200).json({ message: `Acesso estendido por ${daysToAdd} dias` });

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ouvindo na porta ${PORT}`);
});
