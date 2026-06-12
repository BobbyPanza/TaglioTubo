-- ============================================================
-- Vista: XV_TAGLIO_PEZZI
-- Scopo: Pezzi da tagliare con profilo e lunghezza calcolata
-- Db:    FactoryTubo
--
-- Per aggiungere filtri cliente (commessa, lotto, data, ecc.)
-- modificare la WHERE oppure creare una nuova vista basata su questa.
-- ============================================================

CREATE OR ALTER VIEW XV_TAGLIO_PEZZI AS
SELECT
    T3.COCOD                                                     AS CodCommessa,
    T3.CTDSC                                                     AS DscCommessa,
    T2.PACOD                                                     AS CodLotto,
    T2.PADSC                                                     AS DscLotto,
    T4.FMCOD                                                     AS CodProfilo,
    F.FMDSC                                                      AS DscProfilo,
    T4.PACOD                                                     AS CodBarra,
    T4.PADSC                                                     AS DscBarra,
    T1.LAQTP                                                     AS QtaPezzi,
    T4.LOQDB                                                     AS QtaGrezzoTot,
    CAST(T4.LOQDB / T1.LAQTP AS DECIMAL(10, 2))                 AS LunghezzaMm
FROM
    A_LAV  T1
    INNER JOIN A_LOT  T2 ON T1.CONUM = T2.CONUM
                         AND T1.LOCOD = T2.LOCOD
    INNER JOIN A_COM  T3 ON T3.CONUM = T2.CONUM
    INNER JOIN l_cmfe T4 ON T4.CONUM = T2.CONUM
                         AND T4.LOCLP = T2.LOCOD
    LEFT  JOIN a_fam  F  ON F.FMCOD  = T4.FMCOD
WHERE
    T1.FACOD IN ('X030', 'F030')   -- lavorazioni taglio
    AND T1.LAQTP > 0               -- esclude lavorazioni senza pezzi
    AND T4.LOQDB > 0               -- esclude materiali senza lunghezza
GO
