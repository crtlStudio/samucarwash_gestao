import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './novoVeiculoForm.module.css'

const NOVA = '__nova__'

export default function NovoVeiculoForm({ aoFechar, aoGuardar }) {
    const [marcas, setMarcas] = useState([])
    const [marcaSel, setMarcaSel] = useState('')
    const [novaMarca, setNovaMarca] = useState('')
    const [modelo, setModelo] = useState('')
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')

    useEffect(() => {
        supabase
            .from('vehicle_brands')
            .select('id, name')
            .order('name')
            .then(({ data, error }) => {
                if (error) {
                    console.error('Erro ao carregar marcas:', error)
                    setErro('Não foi possível carregar as marcas.')
                    return
                }
                setMarcas(data)
            })
    }, [])

    // Se a marca escrita já existir (ignorando maiúsculas), usa a que já existe
    const existente = marcas.find(
        (m) => m.name.toLowerCase() === novaMarca.trim().toLowerCase()
    )

    const nomeMarca =
        marcaSel === NOVA
            ? existente
                ? existente.name
                : novaMarca.trim()
            : marcaSel

    const podeGuardar =
        nomeMarca !== '' && (modelo.trim() !== '' || (marcaSel === NOVA && !existente))

    async function handleSubmit(e) {
        e.preventDefault()
        if (!podeGuardar) return

        setAEnviar(true)
        setErro('')

        const { error } = await supabase.rpc('add_vehicle', {
            p_brand: nomeMarca,
            p_model: modelo.trim() || null,
        })

        setAEnviar(false)

        if (error) {
            console.error('Erro ao guardar veículo:', error)
            setErro('Não foi possível guardar. Tenta outra vez.')
            return
        }

        aoGuardar?.({ marca: nomeMarca, modelo: modelo.trim() })
        aoFechar()
    }

    return (
        <div className={styles.overlay} onClick={aoFechar}>
            <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.painelHeader}>
                    <h3>Novo veículo</h3>
                    <button type="button" onClick={aoFechar} className={styles.fechar}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label htmlFor="marcaSel">Marca</label>
                    <select
                        id="marcaSel"
                        value={marcaSel}
                        onChange={(e) => setMarcaSel(e.target.value)}
                        required
                    >
                        <option value="">Escolhe a marca</option>
                        {marcas.map((m) => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                        <option value={NOVA}>＋ Nova marca</option>
                    </select>

                    {marcaSel === NOVA && (
                        <>
                            <label htmlFor="novaMarca">Nome da nova marca</label>
                            <input
                                id="novaMarca"
                                type="text"
                                value={novaMarca}
                                onChange={(e) => setNovaMarca(e.target.value)}
                                placeholder="Ex: Smart"
                            />
                            {existente && (
                                <p className={styles.aviso}>
                                    Essa marca já existe, o modelo vai ser acrescentado a {existente.name}.
                                </p>
                            )}
                        </>
                    )}

                    <label htmlFor="modelo">
                        Modelo {marcaSel === NOVA && !existente ? '(opcional)' : ''}
                    </label>
                    <input
                        id="modelo"
                        type="text"
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        placeholder="Ex: Fortwo"
                    />

                    {erro && <p className={styles.erro}>{erro}</p>}

                    <button type="submit" disabled={!podeGuardar || aEnviar} className={styles.confirmar}>
                        {aEnviar ? 'A guardar...' : 'Guardar'}
                    </button>
                </form>
            </div>
        </div>
    )
}