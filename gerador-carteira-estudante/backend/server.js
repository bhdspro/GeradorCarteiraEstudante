// server.js - Backend integrado ao PagSeguro (modo Sandbox)

// Importa as bibliotecas necessárias
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Para carregar variáveis de ambiente

// Inicializa o servidor
const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO DE CORS ---
// Ajuste "origin" para o domínio do seu frontend
const corsOptions = {
  origin: 'https://apps.grupobhds.com'
};

app.use(cors(corsOptions));
app.use(express.json());

// URL base do PagSeguro (sandbox)
const BASE_URL = 'https://sandbox.api.pagseguro.com';

// Rota para criar uma nova cobrança PIX
app.post('/create-payment', async (req, res) => {
  const pagseguroToken = process.env.PAGSEGURO_TOKEN;

  if (!pagseguroToken) {
    return res.status(500).json({ error: 'Token do PagSeguro não configurado no servidor.' });
  }

  // Dados da cobrança (fixos para exemplo)
  const orderData = {
    customer: {
      name: 'Cliente Teste Sandbox',
      email: 'cliente@sandbox.com',
      tax_id: '12345678909'
    },
    items: [
      {
        name: 'Download Carteirinha de Estudante',
        quantity: 1,
        unit_amount: 100 // R$1,00 em centavos
      }
    ],
    qr_codes: [
      {
        amount: {
          value: 100 // R$1,00 em centavos
        }
      }
    ],
    notification_urls: [] // opcional, para webhooks
  };

  try {
    const response = await axios.post(`${BASE_URL}/orders`, orderData, {
      headers: {
        'Authorization': `Bearer ${pagseguroToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      orderId: response.data.id,
      qrCodeText: response.data.qr_codes[0].text
    });

  } catch (error) {
    console.error('Erro ao criar cobrança no PagSeguro:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Falha ao comunicar com o PagSeguro.' });
  }
});

// Rota para verificar o status de um pagamento
app.get('/check-payment/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const pagseguroToken = process.env.PAGSEGURO_TOKEN;

  if (!pagseguroToken) {
    return res.status(500).json({ error: 'Token do PagSeguro não configurado.' });
  }

  try {
    const response = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${pagseguroToken}`,
        'Content-Type': 'application/json'
      }
    });

    const charge = response.data.charges[0];
    if (charge.status === 'PAID') {
      res.json({ status: 'PAID' });
    } else {
      res.json({ status: charge.status });
    }

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Falha ao verificar o status do pagamento.' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor backend rodando em modo SANDBOX na porta ${PORT}`);
});
