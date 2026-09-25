import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './despesaForm.module.css'

export default function DespesaForm({ aoFechar, aoGuardar }) {
    const [valor, setValor] = useState('')
    const [descricao, setDescricao] = useState('')
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')

    const podeGuardar = valor !== '' && Number(valor) > 0 && descricao.trim() !== ''

    async function handleSubmit(e) {
        e.preventDefault()
        if (!podeGuardar) return

        setAEnviar(true)
        setErro('')

        const { error } = await supabase.rpc('add_expense', {
            p_amount: Number(valor),
            p_description: descricao.trim(),
        })

        setAEnviar(false)

        if (error) {
            console.error('Erro ao guardar despesa:', error)
            setErro('Não foi possível guardar. Tenta outra vez.')
            return
        }

        aoGuardar()
        aoFechar()
    }

    return (
        <div className={styles.overlay} onClick={aoFechar}>
            <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.painelHeader}>
                    <h3>Nova despesa</h3>
                    <button onClick={aoFechar} className={styles.fechar}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label htmlFor="valor">Valor (€)</label>
                    <input
                        id="valor"
                        type="number"
                        step="0.01"
                        min="0"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        placeholder="0.00"
                        required
                    />

                    <label htmlFor="descricao">Descrição</label>
                    <input
                        id="descricao"
                        type="text"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="Ex: Champô e cera"
                        required
                    />

                    {erro && <p className={styles.erro}>{erro}</p>}

                    <button type="submit" disabled={!podeGuardar || aEnviar} className={styles.confirmar}>
                        {aEnviar ? 'A guardar...' : 'Guardar despesa'}
                    </button>
                </form>
            </div>
        </div>
    )
}