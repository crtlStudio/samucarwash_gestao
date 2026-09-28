import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './BloqueioForm.module.css'






export default function BloqueioForm({ aoFechar }) {
    const [bloqueios, setBloqueios] = useState(null) // null = a carregar
    const [data, setData] = useState('')
    const [diaInteiro, setDiaInteiro] = useState(true)
    const [horaInicio, setHoraInicio] = useState('')
    const [horaFim, setHoraFim] = useState('')
    const [motivo, setMotivo] = useState('')
    const [aEnviar, setAEnviar] = useState(false)
    const [aRemover, setARemover] = useState(null)
    const [erro, setErro] = useState('')

    function carregarBloqueios() {
        supabase
            .from('blocked_slots')
            .select('*')
            .gte('ends_at', new Date().toISOString())
            .order('starts_at')
            .then(({ data, error }) => {
                if (error) {
                    console.error('Erro ao carregar bloqueios:', error)
                    setBloqueios([])
                    return
                }
                setBloqueios(data)
            })
    }

    useEffect(() => {
        carregarBloqueios()
    }, [])

    const podeGuardar =
        data !== '' && (diaInteiro || (horaInicio !== '' && horaFim !== ''))

    async function handleSubmit(e) {
        e.preventDefault()
        if (!podeGuardar) return

        setAEnviar(true)
        setErro('')

        let inicio, fim
        if (diaInteiro) {
            inicio = new Date(`${data}T00:00`)
            fim = new Date(`${data}T23:59`)
        } else {
            inicio = new Date(`${data}T${horaInicio}`)
            fim = new Date(`${data}T${horaFim}`)
        }

        if (fim <= inicio) {
            setAEnviar(false)
            setErro('A hora de fim tem de ser depois da hora de início.')
            return
        }

        const { error } = await supabase.rpc('add_blocked_slot', {
            p_starts_at: inicio.toISOString(),
            p_ends_at: fim.toISOString(),
            p_reason: motivo.trim() || null,
        })

        setAEnviar(false)

        if (error) {
            console.error('Erro ao bloquear:', error)
            setErro('Não foi possível guardar. Tenta outra vez.')
            return
        }

        setData('')
        setHoraInicio('')
        setHoraFim('')
        setMotivo('')
        setDiaInteiro(true)
        carregarBloqueios()
    }

    async function remover(id) {
        if (!window.confirm('Remover este bloqueio? Esse horário volta a ficar disponível.')) return

        setARemover(id)
        const { error } = await supabase.rpc('delete_blocked_slot', { p_id: id })
        setARemover(null)

        if (error) {
            console.error('Erro ao remover bloqueio:', error)
            return
        }

        setBloqueios((atual) => atual.filter((b) => b.id !== id))
    }

    function formatarIntervalo(b) {
        const inicio = new Date(b.starts_at)
        const fim = new Date(b.ends_at)
        const dataTxt = inicio.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
        const ehDiaInteiro = inicio.getHours() === 0 && fim.getHours() === 23
        if (ehDiaInteiro) return `${dataTxt} · Dia inteiro`
        const h1 = inicio.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
        const h2 = fim.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
        return `${dataTxt} · ${h1} às ${h2}`
    }

    return (
        <div className={styles.overlay} onClick={aoFechar}>
            <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.painelHeader}>
                    <h3>Bloquear horário</h3>
                    <button onClick={aoFechar} className={styles.fechar}>✕</button>
                </div>

                <h4 className={styles.subtitulo}>Bloqueios ativos</h4>
                {bloqueios === null ? (
                    <p className={styles.vazio}>A carregar...</p>
                ) : bloqueios.length === 0 ? (
                    <p className={styles.vazio}>Nenhum bloqueio marcado.</p>
                ) : (
                    <ul className={styles.lista}>
                        {bloqueios.map((b) => (
                            <li key={b.id} className={styles.item}>
                                <div>
                                    <p className={styles.itemData}>{formatarIntervalo(b)}</p>
                                    {b.reason && <p className={styles.itemMotivo}>{b.reason}</p>}
                                </div>
                                <button
                                    onClick={() => remover(b.id)}
                                    disabled={aRemover === b.id}
                                    className={styles.remover}
                                >
                                    {aRemover === b.id ? '...' : 'Remover'}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <h4 className={styles.subtitulo}>Novo bloqueio</h4>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <label htmlFor="data">Data</label>
                    <input
                        id="data"
                        type="date"
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                        required
                    />

                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={diaInteiro}
                            onChange={(e) => setDiaInteiro(e.target.checked)}
                        />
                        Dia inteiro
                    </label>

                    {!diaInteiro && (
                        <div className={styles.horas}>
                            <div>
                                <label htmlFor="horaInicio">Das</label>
                                <input
                                    id="horaInicio"
                                    type="time"
                                    value={horaInicio}
                                    onChange={(e) => setHoraInicio(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="horaFim">Até</label>
                                <input
                                    id="horaFim"
                                    type="time"
                                    value={horaFim}
                                    onChange={(e) => setHoraFim(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <label htmlFor="motivo">Motivo (opcional)</label>
                    <input
                        id="motivo"
                        type="text"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ex: Férias"
                    />

                    {erro && <p className={styles.erro}>{erro}</p>}

                    <button type="submit" disabled={!podeGuardar || aEnviar} className={styles.confirmar}>
                        {aEnviar ? 'A guardar...' : 'Bloquear'}
                    </button>
                </form>
            </div>
        </div>
    )
}