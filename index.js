export default {
    async fetch(request, env) {
        try {
            if (request.method !== 'POST' || new URL(request.url).pathname !== '/enviar-email') {
                return new Response('Not found', { status: 404 });
            }

            const body = await request.json();
            const { nome, email, tel, mensagem } = body || {};

            if (!nome || !email || !mensagem) {
                return new Response('Campos incompletos', { status: 400 });
            }

            // montar payload para SendGrid
            const payload = {
                personalizations: [{ to: [{ email: "SEU_DESTINO@exemplo.com" }] }],
                from: { email: "no-reply@seudominio.com" }, // precisa ser verificado no SendGrid
                subject: "Nova mensagem do site",
                content: [{ type: "text/plain", value: `Nome: ${nome}\nEmail: ${email}\nTelefone: ${tel || 'Não informado'}\n\n${mensagem}` }]
            };

            const sgResp = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!sgResp.ok) {
                const txt = await sgResp.text();
                return new Response(`Erro SendGrid: ${sgResp.status} ${txt}`, { status: 502 });
            }

            return new Response('Mensagem enviada com sucesso!', { status: 200 });

        } catch (err) {
            return new Response('Erro interno', { status: 500 });
        }
    }
}
