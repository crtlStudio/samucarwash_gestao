import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './filtros.module.css'

const ESTADOS = {
    pending: 'Por validar',
    confirmed: 'Confirmada',
    completed: 'Concluída',
}

// Compara telemóveis ignorando espaços e o indicativo 351
function chaveTelefone(t) {
    const d = (t ?? '').replace(/\D/g, '')
    return d.length === 12 && d.startsWith('351') ? d.slice(3) : d
}

function formatarData(iso) {
    const d = new Date(iso)
    const data = d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
    const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    return `${data} · ${hora}`
}

export default function Filtros({ aoFechar }) {
    const [separador, setSeparador] = useState('pessoa') // 'pessoa' | 'tipo'
    const [marcacoes, setMarcacoes] = useState(null) // null = a carregar
    const [servicos, setServicos] = useState([])
    const [erro, setErro] = useState('')
    const [pesquisa, setPesquisa] = useState('')
    const [pessoaSel, setPessoaSel] = useState(null) // chave do telemóvel

    useEffect(() => {
        Promise.all([
            supabase
                .from('bookings')
                .select('id, starts_at, customer_name, customer_phone, status, price_charged, vehicle_brand, vehicle_model, services(name)')
                .neq('status', 'cancelled')
                .order('starts_at', { ascending: false }),
            supabase.from('services').select('name').order('sort_order'),
        ]).then(([b, s]) => {
            if (b.error || s.error) {
                console.error('Erro ao carregar filtros:', b.error ?? s.error)
                setErro('Não foi possível carregar os dados.')
                setMarcacoes([])
                return
            }
            setMarcacoes(b.data)
            setServicos(s.data)
        })
    }, [])

    const lista = marcacoes ?? []

    // ---- Por pessoa ----
    const pessoasMap = new Map()
    lista.forEach((b) => {
        const chave = chaveTelefone(b.customer_phone)
        if (!pessoasMap.has(chave)) {
            // como a lista vem da mais recente para a mais antiga, o nome guardado é o mais recente
            pessoasMap.set(chave, {
                chave,
                nome: b.customer_name,
                telefone: b.customer_phone,
                marcacoes: [],
            })
        }
        pessoasMap.get(chave).marcacoes.push(b)
    })

    const termo = pesquisa.trim().toLowerCase()
    const digitos = termo.replace(/\D/g, '')

    const pessoas = [...pessoasMap.values()]
        .filter(
            (p) =>
                termo === '' ||
                p.nome.toLowerCase().includes(termo) ||
                (digitos !== '' && chaveTelefone(p.telefone).includes(digitos))
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

    const pessoa = pessoaSel ? pessoasMap.get(pessoaSel) : null
    const concluidasPessoa = pessoa ? pessoa.marcacoes.filter((m) => m.status === 'completed') : []
    const totalGasto = concluidasPessoa.reduce((soma, m) => soma + (m.price_charged ?? 0), 0)

    // ---- Por tipo ----
    const porTipo = new Map()
    servicos.forEach((s) => porTipo.set(s.name, { nome: s.name, quantidade: 0, receita: 0 }))
    lista
        .filter((b) => b.status === 'completed')
        .forEach((b) => {
            const atual = porTipo.get(b.services.name) ?? { nome: b.services.name, quantidade: 0, receita: 0 }
            atual.quantidade += 1
            atual.receita += b.price_charged ?? 0
            porTipo.set(b.services.name, atual)
        })
    const tipos = [...porTipo.values()].sort((a, b) => b.quantidade - a.quantidade)
    const maximo = Math.max(1, ...tipos.map((t) => t.quantidade))
    const totalLavagens = tipos.reduce((soma, t) => soma + t.quantidade, 0)

    return (
        <div className={styles.overlay} onClick={aoFechar}>
            <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.painelHeader}>
                    <h3>Filtros</h3>
                    <button onClick={aoFechar} className={styles.fechar}>✕</button>
                </div>

                <div className={styles.separadores}>
                    <button
                        onClick={() => setSeparador('pessoa')}
                        className={`${styles.separador} ${separador === 'pessoa' ? styles.separadorAtivo : ''}`}
                    >
                        Por pessoa
                    </button>
                    <button
                        onClick={() => setSeparador('tipo')}
                        className={`${styles.separador} ${separador === 'tipo' ? styles.separadorAtivo : ''}`}
                    >
                        Por tipo
                    </button>
                </div>

                <div className={styles.conteudo}>
                    {erro && <p className={styles.erro}>{erro}</p>}
                    {marcacoes === null && <p className={styles.vazio}>A carregar...</p>}

                    {marcacoes !== null && separador === 'pessoa' && !pessoa && (
                        <>
                            <input
                                type="text"
                                value={pesquisa}
                                onChange={(e) => setPesquisa(e.target.value)}
                                placeholder="Pesquisar por nome ou telemóvel"
                                className={styles.pesquisa}
                            />

                            {pessoas.length === 0 ? (
                                <p className={styles.vazio}>Nenhum cliente encontrado.</p>
                            ) : (
                                <ul className={styles.lista}>
                                    {pessoas.map((p) => {
                                        const feitas = p.marcacoes.filter((m) => m.status === 'completed').length
                                        return (
                                            <li key={p.chave}>
                                                <button onClick={() => setPessoaSel(p.chave)} className={styles.pessoa}>
                                                    <div>
                                                        <p className={styles.pessoaNome}>{p.nome}</p>
                                                        <p className={styles.pessoaTel}>{p.telefone}</p>
                                                    </div>
                                                    <span className={styles.pessoaContagem}>
                                                        {feitas} {feitas === 1 ? 'lavagem' : 'lavagens'}
                                                    </span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </>
                    )}

                    {marcacoes !== null && separador === 'pessoa' && pessoa && (
                        <>
                            <button onClick={() => setPessoaSel(null)} className={styles.voltar}>
                                ‹ Voltar
                            </button>
                            <p className={styles.pessoaNome}>{pessoa.nome}</p>
                            <p className={styles.pessoaTel}>{pessoa.telefone}</p>

                            <div className={styles.resumo}>
                                <div className={styles.resumoItem}>
                                    <span className={styles.resumoLabel}>Lavagens concluídas</span>
                                    <span className={styles.resumoValor}>{concluidasPessoa.length}</span>
                                </div>
                                <div className={styles.resumoItem}>
                                    <span className={styles.resumoLabel}>Total gasto</span>
                                    <span className={styles.resumoValor}>{totalGasto.toFixed(2)}€</span>
                                </div>
                            </div>

                            <ul className={styles.lista}>
                                {pessoa.marcacoes.map((m) => {
                                    const veiculo = [m.vehicle_brand, m.vehicle_model].filter(Boolean).join(' ')
                                    return (
                                        <li key={m.id} className={styles.item}>
                                            <div>
                                                <p className={styles.itemServico}>{m.services.name}</p>
                                                <p className={styles.itemInfo}>{formatarData(m.starts_at)}</p>
                                                {veiculo && <p className={styles.itemInfo}>{veiculo}</p>}
                                            </div>
                                            <div className={styles.itemDireita}>
                                                <span className={`${styles.badge} ${styles['badge_' + m.status]}`}>
                                                    {ESTADOS[m.status]}
                                                </span>
                                                <span className={styles.itemPreco}>{m.price_charged}€</span>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </>
                    )}

                    {marcacoes !== null && separador === 'tipo' && (
                        <>
                            <ul className={styles.lista}>
                                {tipos.map((t) => (
                                    <li key={t.nome} className={styles.tipo}>
                                        <div className={styles.tipoTopo}>
                                            <span className={styles.tipoNome}>{t.nome}</span>
                                            <span className={styles.tipoQuantidade}>{t.quantidade}</span>
                                        </div>
                                        <div className={styles.barra}>
                                            <div
                                                className={styles.barraPreenchida}
                                                style={{ width: `${(t.quantidade / maximo) * 100}%` }}
                                            />
                                        </div>
                                        <p className={styles.tipoReceita}>{t.receita.toFixed(2)}€ de receita</p>
                                    </li>
                                ))}
                            </ul>
                            <p className={styles.totalLinha}>
                                Total: {totalLavagens} {totalLavagens === 1 ? 'lavagem concluída' : 'lavagens concluídas'}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}