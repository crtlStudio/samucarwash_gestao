import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './movimentos.module.css'

export default function Movimentos({ marcacoes, despesas, aoFechar, aoAtualizar }) {
  const [listaDespesas, setListaDespesas] = useState(despesas)
  const [listaMarcacoes, setListaMarcacoes] = useState(marcacoes)
  const [editando, setEditando] = useState(null)
  const [edValor, setEdValor] = useState('')
  const [edDescricao, setEdDescricao] = useState('')
  const [aProcessar, setAProcessar] = useState(null)


  const entradas = listaMarcacoes.map((m) => ({
    id: `entrada-${m.id}`,
    originalId: m.id,
    tipo: 'entrada',
    data: m.data,
    descricao: m.servico,
    valor: m.preco,
  }))

  const saidas = listaDespesas.map((d) => ({
    id: `saida-${d.id}`,
    originalId: d.id,
    tipo: 'saida',
    data: d.data,
    descricao: d.descricao,
    valor: d.valor,
  }))

  const movimentos = [...entradas, ...saidas].sort((a, b) => b.data.localeCompare(a.data))

  const totalEntradas = entradas.reduce((soma, m) => soma + m.valor, 0)
  const totalSaidas = saidas.reduce((soma, m) => soma + m.valor, 0)
  const saldoAtual = totalEntradas - totalSaidas

  function iniciarEdicao(item) {
    setEditando(item.id)
    setEdValor(String(item.valor))
    setEdDescricao(item.descricao)
  }

  function cancelarEdicao() {
    setEditando(null)
  }

  async function guardarEdicao(item) {
    setAProcessar(item.id)

    const { error } = await supabase.rpc('update_expense', {
      p_id: item.originalId,
      p_amount: Number(edValor),
      p_description: edDescricao.trim(),
    })

    setAProcessar(null)

    if (error) {
      console.error('Erro ao editar despesa:', error)
      return
    }

    setListaDespesas((atual) =>
      atual.map((d) =>
        d.id === item.originalId
          ? { ...d, valor: Number(edValor), descricao: edDescricao.trim() }
          : d
      )
    )
    setEditando(null)
    aoAtualizar?.()
  }

  async function apagarDespesa(item) {
    if (!window.confirm('Apagar esta despesa?')) return

    setAProcessar(item.id)
    const { error } = await supabase.rpc('delete_expense', { p_id: item.originalId })
    setAProcessar(null)

    if (error) {
      console.error('Erro ao apagar despesa:', error)
      return
    }

    setListaDespesas((atual) => atual.filter((d) => d.id !== item.originalId))
    aoAtualizar?.()
  }

  async function apagarEntrada(item) {
    if (!window.confirm('Cancelar esta marcação? Deixa de contar como receita.')) return

    setAProcessar(item.id)
    const { error } = await supabase.rpc('cancel_booking_admin', { p_id: item.originalId })
    setAProcessar(null)

    if (error) {
      console.error('Erro ao cancelar marcação:', error)
      return
    }

    setListaMarcacoes((atual) => atual.filter((m) => m.id !== item.originalId))
    aoAtualizar?.()
  }

  return (
    <div className={styles.overlay} onClick={aoFechar}>
      <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.painelHeader}>
          <h3>Movimentos</h3>
          <button onClick={aoFechar} className={styles.fechar}>✕</button>
        </div>

        <div className={styles.resumo}>
          <div>
            <span className={styles.resumoLabel}>Entradas</span>
            <span className={styles.entrada}>+{totalEntradas.toFixed(2)}€</span>
          </div>
          <div>
            <span className={styles.resumoLabel}>Saídas</span>
            <span className={styles.saida}>-{totalSaidas.toFixed(2)}€</span>
          </div>
          <div>
            <span className={styles.resumoLabel}>Saldo</span>
            <span className={saldoAtual >= 0 ? styles.entrada : styles.saida}>
              {saldoAtual.toFixed(2)}€
            </span>
          </div>
        </div>

        {movimentos.length === 0 ? (
          <p className={styles.semMovimentos}>Sem movimentos registados.</p>
        ) : (
          <ul className={styles.lista}>
            {movimentos.map((m) => (
              <li key={m.id} className={styles.item}>
                {editando === m.id ? (
                  <div className={styles.edicao}>
                    <input
                      type="text"
                      value={edDescricao}
                      onChange={(e) => setEdDescricao(e.target.value)}
                      className={styles.edInput}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={edValor}
                      onChange={(e) => setEdValor(e.target.value)}
                      className={styles.edInputValor}
                    />
                    <div className={styles.edAcoes}>
                      <button
                        onClick={() => guardarEdicao(m)}
                        disabled={aProcessar === m.id}
                        className={styles.edGuardar}
                      >
                        {aProcessar === m.id ? '...' : 'Guardar'}
                      </button>
                      <button onClick={cancelarEdicao} className={styles.edCancelar}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className={styles.descricao}>{m.descricao}</p>
                      <p className={styles.data}>
                        {new Date(m.data).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className={styles.itemDireita}>
                      <span className={m.tipo === 'entrada' ? styles.entrada : styles.saida}>
                        {m.tipo === 'entrada' ? '+' : '-'}
                        {m.valor.toFixed(2)}€
                      </span>
                      <div className={styles.itemAcoes}>
                        {m.tipo === 'saida' && (
                          <button
                            onClick={() => iniciarEdicao(m)}
                            className={styles.acaoIcone}
                            title="Editar"
                          >
                            ✎
                          </button>
                        )}
                        <button
                          onClick={() => (m.tipo === 'saida' ? apagarDespesa(m) : apagarEntrada(m))}
                          disabled={aProcessar === m.id}
                          className={styles.acaoIcone}
                          title={m.tipo === 'saida' ? 'Apagar' : 'Cancelar marcação'}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}