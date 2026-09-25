import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const EMAIL_DESTINO = "samukapeixoto@hotmail.com"
const EMAIL_REMETENTE = "reservas@crtlstudio.pt"

serve(async (req) => {
  try {
    const payload = await req.json()
    const marcacao = payload.record // a linha nova da tabela bookings

    // Só notifica marcações pendentes, feitas pela app do cliente.
    // As que o Samu cria manualmente já entram confirmadas e não devem gerar email.
    if (marcacao.status !== "pending") {
      return new Response(JSON.stringify({ ignorado: true }), { status: 200 })
    }

    // Vai buscar o nome do serviço, já que o payload só tem o service_id
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    const respostaServico = await fetch(
      `${supabaseUrl}/rest/v1/services?id=eq.${marcacao.service_id}&select=name`,
      {
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )
    const servicos = await respostaServico.json()
    const nomeServico = servicos[0]?.name ?? "Serviço"

    const inicio = new Date(marcacao.starts_at)
    const dataFormatada = inicio.toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    const horaFormatada = inicio.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Lisbon",
    })

      const html = `
      <h2>Nova marcação por validar</h2>
      <p><strong>${nomeServico}</strong></p>
      <p>${dataFormatada} às ${horaFormatada}</p>
      <p><strong>Cliente:</strong> ${marcacao.customer_name}</p>
      <p><strong>Telemóvel:</strong> ${marcacao.customer_phone}</p>
      <p><strong>Veículo:</strong> ${marcacao.vehicle_brand ?? "-"} ${marcacao.vehicle_model ?? ""}</p>
      <p>Abre a app de gestão para confirmar.</p>
    `

    const respostaEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_REMETENTE,
        to: EMAIL_DESTINO,
        subject: `Nova marcação: ${nomeServico} - ${dataFormatada}`,
        html,
      }),
    })

    if (!respostaEmail.ok) {
      const erro = await respostaEmail.text()
      console.error("Erro ao enviar email:", erro)
      return new Response(JSON.stringify({ erro }), { status: 500 })
    }

    return new Response(JSON.stringify({ enviado: true }), { status: 200 })
  } catch (erro) {
    console.error("Erro na função:", erro)
    return new Response(JSON.stringify({ erro: String(erro) }), { status: 500 })
  }
})