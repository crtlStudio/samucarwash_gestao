import styles from './menu.module.css'
import icone from '../../Images/wash.png'

export default function Menu({ saldo }){
    return(
        <>
        <section className={styles.container}>
            <div className={styles.iconeContent}>
                <img src={icone} className={styles.icone} />
            </div>

            <div className={styles.tituloContent}>
                <h1 className={styles.titulo}>
                    Samu Car Wash
                </h1>
                <p className={styles.subtitulo}>
                    Gestão
                </p>
            </div>

            <div className={styles.labelContent}>
                <p className={styles.desc}>Lucro/Prejuízo</p>
                <p className={saldo >= 0 ? styles.saldoPositivo : styles.saldoNegativo}>
                    {saldo >= 0 ? '+' : ''}
                    {saldo.toFixed(2)}€
                </p>
            </div>

        </section>
        </>
    )
}