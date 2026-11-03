import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './packsForm.module.css'

const VAZIO = { id: null, name: '', description: '', price: '', duration: '60', active: true }

export default function PacksForm({ aoFechar, aoAtualizar }) {
    const [packs, setPacks] = useState([])
    const [edicao, setEdicao] = useState(null) // null = só lista; objeto = formulário aberto
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')

    async function carregar() {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .order('sort_order')
        if (error) {
            console.error('Erro ao carregar packs:', error)
            setErro('Não foi possível carregar os packs.')
            return
        }
        setPacks(data)
    }

    useEffect(() => {
        carregar()
    }, [])

    function editar(p) {
        setErro('')
        setEdicao({
            id: p.id,
            name: p.name,
            description: p.description ?? '',
            price: String(p.price),
            duration: String(p.duration_minutes),
            active: p.active,
        })
    }

    const podeGuardar =
        edicao &&
        edicao.name.trim() !== '' &&
        Number(edicao.price) >= 0 &&
        edicao.price !== '' &&
        Number(edicao.duration) > 0

    async function guardar(e) {
        e.preventDefault()
        if (!podeGuardar) return

        setAEnviar(true)
        setErro('')

        const preco = Number(String(edicao.price).replace(',', '.'))
        const duracao = Number(edicao.duration)

        const { error } = edicao.id
            ? await supabase.rpc('update_service', {
                  p_id: edicao.id,
                  p_name: edicao.name,
                  p_description: edicao.description,
                  p_price: preco,
                  p_duration_minutes: duracao,
                  p_active: edicao.active,
              })
            : await supabase.rpc('add_service', {
                  p_name: edicao.name,
                  p_description: edicao.description,
                  p_price: preco,
                  p_duration_minutes: duracao,
              })

        setAEnviar(false)

        if (error) {
            console.error('Erro ao guardar pack:', error)
            setErro('Não foi possível guardar. Tenta outra vez.')
            return
        }

        setEdicao(null)
        await carregar()
        aoAtualizar?.()
    }

    async function alternarAtivo(p) {
        const { error } = await supabase.rpc('update_service', {
            p_id: p.id,
            p_name: p.name,
            p_description: p.description ?? '',
            p_price: p.price,
            p_duration_minutes: p.duration_minutes,
            p_active: !p.active,
        })
        if (error) {
            console.error('Erro ao alterar estado:', error)
            setErro('Não foi possível alterar o estado.')
            return
        }
        await carregar()
        aoAtualizar?.()
    }

    async function apagar(p) {
        if (!window.confirm(`Apagar o pack "${p.name}"? Esta ação não pode ser desfeita.`)) return

        setErro('')
        const { error } = await supabase.rpc('delete_service', { p_id: p.id })

        if (error) {
            console.error('Erro ao apagar pack:', error)
            setErro(
                error.message.includes('service_in_use')
                    ? `"${p.name}" já tem marcações e não pode ser apagado. Desativa-o em vez disso.`
                    : 'Não foi possível apagar. Tenta outra vez.'
            )
            return
        }

        await carregar()
        aoAtualizar?.()
    }

    return (
        <div className={styles.overlay} onClick={aoFechar}>
            <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.painelHeader}>
                    <h3>Packs</h3>
                    <button type="button" onClick={aoFechar} className={styles.fechar}>✕</button>
                </div>

                {!edicao && (
                    <>
                        <ul className={styles.lista}>
                            {packs.map((p) => (
                                <li key={p.id} className={`${styles.item} ${p.active ? '' : styles.inativo}`}>
                                    <div className={styles.info}>
                                        <strong>{p.name}</strong>
                                        <span>{p.price}€ · {p.duration_minutes} min{p.active ? '' : ' · desativado'}</span>
                                    </div>
                                    <div className={styles.acoes}>
                                        <button type="button" onClick={() => editar(p)}>Editar</button>
                                        <button type="button" onClick={() => alternarAtivo(p)}>
                                            {p.active ? 'Desativar' : 'Ativar'}
                                        </button>
                                        <button type="button" className={styles.apagar} onClick={() => apagar(p)}>
                                            Apagar
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {erro && <p className={styles.erro}>{erro}</p>}

                        <button
                            type="button"
                            className={styles.confirmar}
                            onClick={() => { setErro(''); setEdicao({ ...VAZIO }) }}
                        >
                            ＋ Novo pack
                        </button>
                    </>
                )}

                {edicao && (
                    <form onSubmit={guardar} className={styles.form}>
                        <label htmlFor="packNome">Nome</label>
                        <input
                            id="packNome"
                            type="text"
                            value={edicao.name}
                            onChange={(e) => setEdicao({ ...edicao, name: e.target.value })}
                            placeholder="Ex: Interior Essencial"
                            required
                        />

                        <label htmlFor="packDescricao">Descrição</label>
                        <textarea
                            id="packDescricao"
                            rows={3}
                            value={edicao.description}
                            onChange={(e) => setEdicao({ ...edicao, description: e.target.value })}
                            placeholder="O que inclui"
                        />

                        <label htmlFor="packPreco">Preço (€)</label>
                        <input
                            id="packPreco"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={edicao.price}
                            onChange={(e) => setEdicao({ ...edicao, price: e.target.value })}
                            required
                        />

                        <label htmlFor="packDuracao">Duração</label>
                        <select
                            id="packDuracao"
                            value={edicao.duration}
                            onChange={(e) => setEdicao({ ...edicao, duration: e.target.value })}
                        >
                            <option value="60">1 hora</option>
                            <option value="120">2 horas</option>
                            <option value="180">3 horas</option>
                        </select>

                        {erro && <p className={styles.erro}>{erro}</p>}

                        <button type="submit" disabled={!podeGuardar || aEnviar} className={styles.confirmar}>
                            {aEnviar ? 'A guardar...' : 'Guardar'}
                        </button>
                        <button type="button" className={styles.secundario} onClick={() => { setEdicao(null); setErro('') }}>
                            Voltar
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
