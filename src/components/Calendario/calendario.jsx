import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './calendario.module.css'

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const COR_POR_SERVICO = {
  interior: 'azul',
  exterior: 'verde',
  completo: 'roxo',
}

function gerarGrelha(ano, mes) {
  const primeiro = new Date(ano, mes, 1)
  const offset = (primeiro.getDay() + 6) % 7 // semana começa em segunda
  const inicio = new Date(ano, mes, 1 - offset)

  const dias = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    dias.push(d)
  }
  return dias
}

function paraChave(d) {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function paraWhatsapp(telefone) {
  const digitos = telefone.replace(/\D/g, '')
  return digitos.startsWith('351') ? digitos : '351' + digitos
}

function paraGoogleCalendar(m) {
  const formatar = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const texto = encodeURIComponent(`${m.servico} - Samu Car Wash`)
  const datas = `${formatar(m.inicioISO)}/${formatar(m.fimISO)}`
  const detalhes = encodeURIComponent('A tua marcação na Samu Car Wash.')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${texto}&dates=${datas}&details=${detalhes}`
}

export default function Calendario({ aoAtualizar }) {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [diaAberto, setDiaAberto] = useState(null)
  const [marcacoes, setMarcacoes] = useState([])
  const [aAceitar, setAAceitar] = useState(null) // id da reserva a ser aceite
  const [aFinalizar, setAFinalizar] = useState(null) // id do serviço a ser finalizado

  const dias = gerarGrelha(ano, mes)

  useEffect(() => {
    const inicioMes = new Date(ano, mes, 1)
    const fimMes = new Date(ano, mes + 1, 1)

    supabase
      .from('bookings')
      .select('id, starts_at, ends_at, customer_name, customer_phone, status, price_charged, vehicle_brand, vehicle_model, services(name, slug)')
      .gte('starts_at', inicioMes.toISOString())
      .lt('starts_at', fimMes.toISOString())
      .neq('status', 'cancelled')
      .order('starts_at')
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar marcações:', error)
          return
        }
        setMarcacoes(
          data.map((b) => {
            const inicio = new Date(b.starts_at)
            return {
              id: b.id,
              data: paraChave(inicio),
              hora: inicio.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
              inicioISO: b.starts_at,
              fimISO: b.ends_at,
              servico: b.services.name,
              cor: COR_POR_SERVICO[b.services.slug] ?? 'azul',
              nome: b.customer_name,
              telefone: b.customer_phone,
              status: b.status,
              preco: b.price_charged,
              marca: b.vehicle_brand,
              modelo: b.vehicle_model,
            }
          })
        )
      })
  }, [ano, mes])

  function mudarMes(n) {
    const d = new Date(ano, mes + n, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
  }

  function marcacoesDoDia(d) {
    const chave = paraChave(d)
    return marcacoes
      .filter((m) => m.data === chave)
      .sort((a, b) => a.hora.localeCompare(b.hora))
  }

  async function aceitarReserva(m) {
    setAAceitar(m.id)

    const { error } = await supabase.rpc('confirm_booking', { p_id: m.id })

    setAAceitar(null)

    if (error) {
      console.error('Erro ao confirmar reserva:', error)
      return
    }

    setMarcacoes((atual) =>
      atual.map((x) => (x.id === m.id ? { ...x, status: 'confirmed' } : x))
    )

    aoAtualizar?.()

    const linkCalendario = paraGoogleCalendar(m)
    const mensagem = `Reserva confirmada, obrigado pela preferência!\n\nAdicionar ao calendário: ${linkCalendario}`
    const numero = paraWhatsapp(m.telefone)
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function finalizarServico(m) {
    setAFinalizar(m.id)

    const { error } = await supabase.rpc('complete_booking', { p_id: m.id })

    setAFinalizar(null)

    if (error) {
      console.error('Erro ao finalizar serviço:', error)
      return
    }

    setMarcacoes((atual) =>
      atual.map((x) => (x.id === m.id ? { ...x, status: 'completed' } : x))
    )

    aoAtualizar?.()
  }

  const totalPendentes = marcacoes.filter((m) => m.status === 'pending').length
  const marcacoesPainel = diaAberto ? marcacoesDoDia(diaAberto) : []

  return (
    <div className={styles.container}>
      <div className={styles.topContent}>      
          <h1 className={styles.titulo}>Reservas</h1>
          {totalPendentes > 0 && (
            <span className={styles.notificacaoLabel}>{totalPendentes} reserva(s) por validar</span>
          )}
      </div>

      <div className={styles.navMes}>
        <button onClick={() => mudarMes(-1)} className={styles.seta}>‹</button>
        <h2 className={styles.mes}>
          {new Date(ano, mes).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => mudarMes(1)} className={styles.seta}>›</button>
      </div>

      <div className={styles.cabecalho}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} className={styles.diaSemana}>{d}</div>
        ))}
      </div>

      <div className={styles.grelha}>
        {dias.map((d) => {
          const foraDoMes = d.getMonth() !== mes
          const ehHoje = paraChave(d) === paraChave(hoje)
          const marcacoesDia = marcacoesDoDia(d)
          const temPendente = marcacoesDia.some((m) => m.status === 'pending')
          const temConfirmado = marcacoesDia.some((m) => m.status === 'confirmed')

          return (
            <button
              key={d.toISOString()}
              onClick={() => setDiaAberto(d)}
              className={`${styles.celula} ${foraDoMes ? styles.foraDoMes : ''} ${
                temPendente ? styles.pendente : temConfirmado ? styles.emAndamento : ''
              }`}
            >
              <span className={`${styles.numeroDia} ${ehHoje ? styles.hoje : ''}`}>
                {d.getDate()}
              </span>

              {marcacoesDia.length > 0 && (
                <div className={styles.pontos}>
                  {marcacoesDia.slice(0, 3).map((m) => (
                    <span
                      key={m.id}
                      className={`${styles.ponto} ${styles['cor_' + m.cor]}`}
                    />
                  ))}
                  {marcacoesDia.length > 3 && (
                    <span className={styles.maisReservas}>+{marcacoesDia.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {diaAberto && (
        <div className={styles.overlay} onClick={() => setDiaAberto(null)}>
          <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.painelHeader}>
              <h3>
                {diaAberto.toLocaleDateString('pt-PT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <button onClick={() => setDiaAberto(null)} className={styles.fechar}>✕</button>
            </div>

            {marcacoesPainel.length === 0 ? (
              <p className={styles.semReservas}>Sem reservas neste dia.</p>
            ) : (
              <ul className={styles.listaReservas}>
                {marcacoesPainel.map((m) => (
                  <li key={m.id} className={styles.itemReserva}>
                    <section className={styles.itemTopo}>
                      <div className={styles.hora}>
                        <span className={`${styles.pontoLista} ${styles['cor_' + m.cor]}`} />
                        <span className={styles.horaReserva}>{m.hora}</span>
                      </div>
                      
                      <span className={styles.nomeServico}>{m.servico}</span>

                      {m.status === 'pending' && (
                        <span className={styles.badgePendente}>Por validar</span>
                      )}
                      {m.status === 'confirmed' && (
                        <span className={styles.badgeConfirmada}>Confirmada</span>
                      )}
                      {m.status === 'completed' && (
                        <span className={styles.badgeCompleta}>Concluída</span>
                      )}
                    </section>

                    <div className={styles.itemDados}>
                      <p>{m.nome}</p>
                      <p>{m.telefone}</p>
                      {(m.marca || m.modelo) && (
                        <p>{m.marca ?? ''} --- {m.modelo ?? ''}</p>
                      )}
                    </div>

                    {m.status === 'pending' && (
                      <button
                        onClick={() => aceitarReserva(m)}
                        disabled={aAceitar === m.id}
                        className={styles.aceitar}
                      >
                        {aAceitar === m.id ? 'A aceitar...' : 'Aceitar reserva'}
                      </button>
                    )}

                    {m.status === 'confirmed' && (
                      <button
                        onClick={() => finalizarServico(m)}
                        disabled={aFinalizar === m.id}
                        className={styles.finalizar}
                      >
                        {aFinalizar === m.id ? 'A finalizar...' : 'Finalizar serviço'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}