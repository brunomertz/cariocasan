export default {
    async fetch(request, env) {
        // Habilita CORS
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Responde ao preflight CORS
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Só aceita POST
        if (request.method !== 'POST') {
            return new Response('Método não permitido', {
                status: 405,
                headers: { ...corsHeaders, 'Allow': 'POST' }
            });
        }

        try {
            const body = await request.json();
            const { nome, email, tel, mensagem } = body || {};

            if (!nome || !email || !mensagem) {
                return new Response('Por favor, preencha todos os campos obrigatórios.', {
                    status: 400,
                    headers: corsHeaders
                });
            }

            const payload = {
                personalizations: [{ to: [{ email: env.TO_EMAIL }] }],
                from: { email: env.FROM_EMAIL },
                reply_to: { email: email, name: nome },
                subject: `Nova mensagem do site de: ${nome}`,
                content: [{
                    type: "text/plain",
                    value: `Você recebeu uma nova mensagem do formulário de contato do site.\n\nNome: ${nome}\nEmail: ${email}\nTelefone: ${tel || 'Não informado'}\n\nMensagem:\n${mensagem}`
                }]
            };

            const sgResp = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!sgResp.ok) {
                const errorText = await sgResp.text();
                console.error(`Erro do SendGrid: ${sgResp.status} ${errorText}`);
                return new Response(`Ocorreu um erro ao tentar enviar o e-mail. (SG: ${sgResp.status})`, {
                    status: 502,
                    headers: corsHeaders
                });
            }

            return new Response("Mensagem enviada com sucesso!", {
                status: 200,
                headers: corsHeaders
            });

        } catch (err) {
            console.error('Erro na função de envio de e-mail:', err);
            return new Response('Erro interno ao processar o formulário.', {
                status: 500,
                headers: corsHeaders
            });
        }
    }
};