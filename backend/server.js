// server.js - Nosso servidor seguro para interagir com o PagSeguro

// Importa as bibliotecas necessárias
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Para carregar as variáveis de ambiente (sua chave secreta)

// Inicializa o servidor
const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO DE CORS ATUALIZADA ---
// Define qual domínio tem permissão para acessar este backend.
const corsOptions = {
  origin: 'https://apps.grupobhds.com' // Permite requisições do seu domínio personalizado
};

// Aplica as configurações de CORS e JSON
app.use(cors(corsOptions));
app.use(express.json()); // Permite que o servidor entenda JSON

// Rota para criar uma nova cobrança PIX
app.post('/create-payment', async (req, res) => {
    // Pega o token de autenticação do PagSeguro das variáveis de ambiente
    const pagseguroToken = process.env.PAGSEGURO_TOKEN;

    if (!pagseguroToken) {
        return res.status(500).json({ error: 'Token do PagSeguro não configurado no servidor.' });
    }

    // Dados da cobrança
    const orderData = {
        customer: {
            name: 'Cliente Gerador Carteirinha',
            email: 'cliente@email.com', // Email genérico
            tax_id: '12345678909' // CPF genérico
        },
        items: [{
            name: 'Download Carteirinha de Estudante',
            quantity: 1,
            unit_amount: 100 // O valor é em centavos! R$ 1,00 = 100
        }],
        qr_codes: [{
            amount: {
                value: 100 // Valor em centavos
            }
        }],
        notification_urls: [] // Pode ser usado para receber notificações de pagamento
    };

    try {
        // Faz a chamada para a API do PagSeguro
        const response = await axios.post('https://api.pagseguro.com/orders', orderData, {
            headers: {
                'Authorization': `Bearer ${pagseguroToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Retorna os dados do QR Code e o ID da cobrança para o frontend
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
        // Faz a chamada para a API do PagSeguro para consultar a ordem
        const response = await axios.get(`https://api.pagseguro.com/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${pagseguroToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Verifica se a cobrança foi paga
        const charge = response.data.charges[0];
        if (charge.status === 'PAID') {
            res.json({ status: 'PAID' });
        } else {
            res.json({ status: charge.status }); // Retorna o status atual (ex: WAITING)
        }

    } catch (error) {
        console.error('Erro ao verificar pagamento:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Falha ao verificar o status do pagamento.' });
    }
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
});
