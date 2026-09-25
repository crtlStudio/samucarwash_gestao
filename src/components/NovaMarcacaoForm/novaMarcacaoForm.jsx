import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './novaMarcacaoForm.module.css'
import { VEICULOS } from '../../data/veiculos'





export default function NovaMarcacaoForm({ aoFechar, aoGuardar }) {
    const [servicos, setServicos] = useState([])
    const [servicoId, setServicoId] = useState('')
    const [data, setData] = useState('')
    const [hora, setHora] = useState('')
    const [nome, setNome] = useState('')
    const [telemovel, setTelemovel] = useState('')
    const [status, setStatus] = useState('confirmed')
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')
    const [marca, setMarca] = useState('')
    const [modelo, setModelo] = useState('')

    useEffect(() => {
        supabase
            .from('services')
            .select('slug, name')
            .eq('active', true)
            .order('sort_order')
            .then(({ data, error }) => {
                if (error) {
                    console.error('Erro ao carregar serviços:', error)
                    return
                }
                setServicos(data)
                if (data.length > 0) setServicoId(data[0].slug)
            })
    }, [])

    const podeGuardar =
        servicoId !== '' && data !== '' && hora !== '' && nome.trim() !== '' && telemovel.trim() !== ''

    function mensagemDeErro(msg) {
        if (msg.includes('slot_taken')) return 'Já existe uma marcação nessa hora.'
        if (msg.includes('service_not_available')) return 'Esse serviço não está disponível.'
        return 'Não foi possível guardar a marcação. Tenta outra vez.'
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!podeGuardar) return

        setAEnviar(true)
        setErro('')

        const inicio = new Date(`${data}T${hora}`)

        const { error } = await supabase.rpc('admin_create_booking', {
            p_service_slug: servicoId,
            p_starts_at: inicio.toISOString(),
            p_name: nome.trim(),
            p_phone: telemovel.trim(), 
            p_status: status,
            p_brand: marca.trim() || null,
            p_model: modelo.trim() || null,
        })

        setAEnviar(false)

        if (error) {
            setErro(mensagemDeErro(error.message))
            return
        }

        aoGuardar()
        aoFechar()
    }

    function escolherMarca(e) {
        setMarca(e.target.value)
        setModelo('') // ao mudar de marca, o modelo antigo deixa de valer
    }

    return (
        <div className={styles.overlay} onClick={aoFechar}>
            <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.painelHeader}>
                    <h3>Nova marcação</h3>
                    <button onClick={aoFechar} className={styles.fechar}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label htmlFor="servico">Tipo de lavagem</label>
                    <select
                        id="servico"
                        value={servicoId}
                        onChange={(e) => setServicoId(e.target.value)}
                        required
                    >
                        {servicos.map((s) => (
                            <option key={s.slug} value={s.slug}>{s.name}</option>
                        ))}
                    </select>

                    <label htmlFor="data">Data</label>
                    <input
                        id="data"
                        type="date"
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                        required
                    />

                    <label htmlFor="hora">Hora</label>
                    <input
                        id="hora"
                        type="time"
                        value={hora}
                        onChange={(e) => setHora(e.target.value)}
                        required
                    />

                    <label htmlFor="nome">Nome</label>
                    <input
                        id="nome"
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Nome do cliente"
                        required
                    />

                    <label htmlFor="telemovel">Telemóvel</label>
                    <input
                        id="telemovel"
                        type="tel"
                        value={telemovel}
                        onChange={(e) => setTelemovel(e.target.value)}
                        placeholder="912345678"
                        required
                    />

                    <label htmlFor="marca">Marca (opcional)</label>
                    <select id="marca" value={marca} onChange={escolherMarca}>
                        <option value="">Marca</option>
                        {Object.keys(VEICULOS).sort((a, b) => a.localeCompare(b, 'pt')).map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    <label htmlFor="modelo">Modelo (opcional)</label>
                    <select
                        id="modelo"
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        disabled={!marca}
                    >
                        <option value="">Modelo</option>
                        {(VEICULOS[marca] ?? []).map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    <label htmlFor="status">Estado</label>
                    <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="confirmed">Confirmada</option>
                        <option value="completed">Concluída (já realizada)</option>
                    </select>

                    {erro && <p className={styles.erro}>{erro}</p>}

                    <button type="submit" disabled={!podeGuardar || aEnviar} className={styles.confirmar}>
                        {aEnviar ? 'A guardar...' : 'Guardar marcação'}
                    </button>
                </form>
            </div>
        </div>
    )
}