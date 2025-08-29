// server.js - Backend seguro para integração PIX via Asaas (produção)
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS: permite apenas seu frontend ---
app.use(cors({ origin: 'https://apps.grupobhds.com' }));
app.use(express.json());

// --- Criar pagamento PIX ---
app.post('/create-payment', async (req, res) => {
    try {
        const asaasToken = process.env.ASAAS_TOKEN;
        if (!asaasToken) return res.status(500).json({ error: 'Token Asaas não configurado.' });

        // Cria um cliente genérico (para produção você pode pegar info do usuário)
        const clientResponse = await axios.post('https://www.asaas.com/api/v3/customers', {
            name: 'Cliente Gerador Carteirinha',
            email: 'cliente@email.com',
            cpfCnpj: '12345678909'
        }, {
            headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' }
        });

        const customerId = clientResponse.data.id;

        // Cria pagamento PIX
        const paymentResponse = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: customerId,
            billingType: 'PIX',
            dueDate: new Date(Date.now() + 15*60*1000).toISOString().split('T')[0],
            value: 1.00,
            description: 'Download Carteirinha de Estudante',
            externalReference: 'carteirinha-' + Date.now()
        }, {
            headers: { 'access_token': asaasToken, 'Content-Type': 'application/json' }
        });

        res.json({
            paymentId: paymentResponse.data.id,
            qrCode: paymentResponse.data.pixQrCode
        });

    } catch (error) {
        console.error('Erro criar pagamento:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha ao criar pagamento PIX.' });
    }
});

// --- Verificar status do pagamento ---
app.get('/check-payment/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const asaasToken = process.env.ASAAS_TOKEN;

        const response = await axios.get(`https://www.asaas.com/api/v3/payments/${paymentId}`, {
            headers: { 'access_token': asaasToken }
        });

        const status = response.data.status;
        res.json({ status });

    } catch (error) {
        console.error('Erro verificar pagamento:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha ao verificar pagamento.' });
    }
});

// --- Webhook para pagamento (opcional, mas recomendado) ---
app.post('/webhook', (req, res) => {
    console.log('Webhook recebido:', req.body);
    // Aqui você pode disparar a liberação automática do download
    res.status(200).send('OK');
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
