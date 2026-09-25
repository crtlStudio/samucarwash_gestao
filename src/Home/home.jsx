import { useEffect, useState } from 'react'
import Calendario from '../components/Calendario/calendario'
import Menu from '../components/Menu/menu'
import styles from './home.module.css'
import DespesaForm from '../components/DespesaForm/despesaForm'
import Movimentos from '../components/Movimentos/movimentos'
import NovaMarcacaoForm from '../components/NovaMarcacaoForm/novaMarcacaoForm'
import { supabase } from '../lib/supabase'
import { IoMdAdd } from "react-icons/io";
import { FaListUl } from "react-icons/fa";
import { MdOutlinePlaylistAdd } from "react-icons/md";





export default function Home() {

    const [mostrarDespesa, setMostrarDespesa] = useState(false)
    const [mostrarMovimentos, setMostrarMovimentos] = useState(false)
    const [mostrarNovaMarcacao, setMostrarNovaMarcacao] = useState(false)

    const [calendarioKey, setCalendarioKey] = useState(0)
    const [refreshKey, setRefreshKey] = useState(0)

    const [marcacoesReceita, setMarcacoesReceita] = useState([])
    const [despesas, setDespesas] = useState([])

    useEffect(() => {
        supabase
            .from('bookings')
            .select('id, starts_at, price_charged, status, services(name)')
            .eq('status', 'completed')
            .order('starts_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('Erro ao carregar receita:', error)
                    return
                }
                setMarcacoesReceita(
                    data.map((b) => ({
                        id: b.id,
                        data: new Date(b.starts_at).toISOString().slice(0, 10),
                        servico: b.services.name,
                        preco: b.price_charged,
                    }))
                )
            })
    }, [refreshKey])

    useEffect(() => {
        supabase
            .from('expenses')
            .select('*')
            .order('spent_on', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('Erro ao carregar despesas:', error)
                    return
                }
                setDespesas(
                    data.map((d) => ({
                        id: d.id,
                        data: d.spent_on,
                        descricao: d.description,
                        valor: d.amount,
                    }))
                )
            })
    }, [refreshKey])

    const totalEntradas = marcacoesReceita.reduce((soma, m) => soma + m.preco, 0)
    const totalSaidas = despesas.reduce((soma, d) => soma + d.valor, 0)
    const saldo = totalEntradas - totalSaidas

    function guardarDespesa() {
        setRefreshKey((k) => k + 1)
    }

    function marcacaoGuardada() {
        setCalendarioKey((k) => k + 1) // força o calendário a recarregar
        setRefreshKey((k) => k + 1)    // e o saldo, caso já entre confirmada/concluída
    }

    return (
        <>
        <section className={styles.container} />
            <Menu saldo={saldo} />
            <div className={styles.bottonContent}>
                <button onClick={() => setMostrarDespesa(true)} className={styles.botton}>
                    <IoMdAdd className={styles.add} />
                    Despesa
                </button>
                <button onClick={() => setMostrarMovimentos(true)} className={styles.botton2}>
                    <FaListUl className={styles.mov} />
                    Movimentos
                </button>
                <button onClick={() => setMostrarNovaMarcacao(true)} className={styles.botton3}>
                    <MdOutlinePlaylistAdd className={styles.book} />
                    Marcação
                </button>
            </div>

            <Calendario
                key={calendarioKey}
                aoAtualizar={() => setRefreshKey((k) => k + 1)}
            />

            {mostrarDespesa && (
                <DespesaForm
                    aoFechar={() => setMostrarDespesa(false)}
                    aoGuardar={guardarDespesa}
                />
            )}

            {mostrarMovimentos && (
                <Movimentos
                    marcacoes={marcacoesReceita}
                    despesas={despesas}
                    aoFechar={() => setMostrarMovimentos(false)}
                    aoAtualizar={() => setRefreshKey((k) => k + 1)}
                />
            )}

            {mostrarNovaMarcacao && (
                <NovaMarcacaoForm
                    aoFechar={() => setMostrarNovaMarcacao(false)}
                    aoGuardar={marcacaoGuardada}
                />
            )}
        <section/>
        </>
    )
}