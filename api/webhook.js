const admin = require('firebase-admin');
let key = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDfQX/Pe6mZn+KI\nlZ/q8T53uQLi4Rkm/Y5iMP6YROtb3Jrk7opumnaBrOjgoQALfK4bzkvpGY/Hc60K\n7TgDPG0dUX+xLEEIeAUdQCYF+VnIpVJfKFuwMDbtC/Bw+1ZyqQilD20Be1APQdvQ\n2FMaVbVgMU/ajdk6qNHdaAB/Xam8WYWC6Y+sAr/YEbyFWMAXZCeuUYvDXBAt2Toq\nEXmkL2UKjPWf+M6EF/xykHz2KHHLAYfR6Gx8Fp9lj5G/Z7QsvE/+VWrXZp9Cc+p8\nn3CrOM9t6Cwgk+N5fXVwbPqtxjuzb0CP8QbQVkXUpiwL2Q8/wrVrSuyc5ZbQFVPD\nbaAdSRXFAgMBAAECggEAFkRZo4+RcF2WggnuW8f484bz5z4NPKrQbzG0yuog0VY0\n6r1x+CsWw8NDrNfSAdNLKEHQp2yhvwJmEW9shUIbHe/5fOnNiLMzy2GRCUp/7ney\nugPz9SQx7j2hGxuuWRxL3O6ncBzk9MicTH2u+DLxNqlkbgd00Zlx6RPM7OciHUNe\n0CjtV87L3hpSTlxFJuqW7PWiEY+hbrXjX26t7wRsDxnIaUO1+fAd3V/MsMOiQ1WI\nzVn2cHUUdFkct9B78oEuelEhpEnKA5jft4wf2Yo9DetvG8p1kloyi39aV8M61/9w\nM8aX9Nc/psfpEQqVbZCVnwXzMwyakaUyEjxmjDgPQQKBgQDy+GJu+zy4awxN0wkC\nj/5Lh1QqmJcQ9YFVVE1QXbKSpF9juuwW1gN87p/2+B557MrHVbNJy1W9h8GkRgW8\nocflByNEbKKlJXX77wIsmfY86gxJvoJmk3mjVJUTOmwI5Pw5/Jcw2z0dlPzyN6JT\nn2U/0mzZ10xGEIDlfaIedXQEoQKBgQDrOnc/DbS2GrWPQT1zL9/7Tk8OcZJMa3/b\nsnUNxiaKAJdLZXxJzDGu+7zm3Ru6dYPXncztLM6N4Wyt2p7loBlAvwKHBRjBuHXm\njA3PRZmmvMkGgPJvh/hPcp3jS2vMf9Wxe17b/cjouO6cs72J+rewAc51HUvc1Kjd\nwfK4AvHapQKBgBsutrR73xsyvrmmNofW3DhO95ecYqo/DS0itVOcZ/IH+bQKoYcc\ngl9jwvm6YI57c2RBrkE/QmRl38AlJVcpMlfpKITrMncPbde1saSTxPyjoqRNcAFR\n1nXzbIouKxADrkQ+ghuxK3E3zeS7XKnGV2mAfTUR5TKhfgouuAh4U3aBAoGAPmGO\n5iXYWsLSi18d0MJNf/PQe2AbEDEiAz1cVX7LEaX+eXw8bcW9F06jVgYlKFmp0TCD\n/BH55R53F9P2d6bxi34cSXpMinNEsRNLRkCK8vD1zse7g2BntYoL3Q9PUzhDj4HM\nMkMnWLBSdzQje8gFlqOkAOL4D2RGNCkPGUWOphECgYBoIw7e8oCScRELo1rfUYVP\nhhe+P+KCgbb5Ez3VF0ISLNJXG5h6wDy4vnfy5086/9FXkimsYnRlZqXOkKXgkLwq\nl1FNnI/aC6lTzpWJgIG0zoiJ1lC7C66YnjhZln3FJTl9nN/brcmLghtoWbDrr4FX\nBcHXoflbMCP0viHWI4q0Kg==\n-----END PRIVATE KEY-----\n"
key = key.replace(/\\n/g, '\n')
// const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
// Evita reinicialização múltipla em ambiente serverless
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: 'service_account',
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: key ,
      // privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID,
      authUri: 'https://accounts.google.com/o/oauth2/auth',
      tokenUri: 'https://oauth2.googleapis.com/token',
      authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
      clientC509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
    }),
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

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
};
