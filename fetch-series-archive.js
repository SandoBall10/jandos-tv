/**
 * fetch-series-archive.js
 * Consulta la API pública de Internet Archive (metadata) y descarga el catálogo
 * de episodios en español latino para las 6 series:
 * 1. El Chavo del 8
 * 2. La Familia Ingalls
 * 3. Dragon Ball Z
 * 4. Caballeros del Zodiaco
 * 5. Supercampeones
 * 6. Death Note
 *
 * Genera 'series-catalogo.json' y actualiza los canales 21-26 en 'canales-remotos.json'.
 */

const fs = require('fs');
const path = require('path');

const SERIES_CONFIG = [
    {
        id: 21,
        slug: 'el-chavo-del-8',
        name: 'El Chavo del 8 (24/7)',
        seriesTitle: 'El Chavo del 8',
        archiveId: 'el-chavo-del-8-Lat',
        filter: (f) => f.name.endsWith('.mp4') && !f.name.endsWith('.ia.mp4'),
        parseNumTitle: (f, idx) => {
            // e.g. "001 El Ropavejero.mp4"
            const cleanName = f.name.replace(/\.mp4$/i, '').trim();
            const m = cleanName.match(/^(\d+)\s*(.*)$/);
            const num = m ? parseInt(m[1], 10) : (idx + 1);
            let epTitle = m && m[2] ? m[2].trim() : cleanName;
            epTitle = epTitle.replace(/^[-_]\s*/, '');
            const padNum = num < 10 ? '0' + num : '' + num;
            return {
                num: num,
                title: `Cap. ${padNum} - ${epTitle || 'Episodio ' + num}`
            };
        },
        maxEpisodes: 60
    },
    {
        id: 22,
        slug: 'la-familia-ingalls',
        name: 'La Familia Ingalls (24/7)',
        seriesTitle: 'La Familia Ingalls',
        archiveId: 'casadelapraderatemp01',
        filter: (f) => f.name.endsWith('.mp4') && !f.name.endsWith('.ia.mp4') && (f.size > 20 * 1024 * 1024),
        parseNumTitle: (f, idx) => {
            // e.g. "1x04 Una cosecha de amigos.mp4" or "1x00 Episodio Piloto - Parte 1.mp4"
            const cleanName = f.name.replace(/\.mp4$/i, '').trim();
            const num = idx + 1;
            const padNum = num < 10 ? '0' + num : '' + num;
            let epTitle = cleanName.replace(/^\d+x\d+\s*/i, '').trim();
            return {
                num: num,
                title: `Cap. ${padNum} - ${epTitle || 'Episodio ' + num}`
            };
        },
        maxEpisodes: 30
    },
    {
        id: 23,
        slug: 'dragon-ball-z',
        name: 'Dragon Ball Z (24/7)',
        seriesTitle: 'Dragon Ball Z',
        archiveId: 'Dragon-Ball-Z-Latino-JP',
        filter: (f) => f.name.endsWith('.mp4') && !f.name.endsWith('.ia.mp4') && f.name.includes('Saga Saiyajins') && (f.size > 20 * 1024 * 1024),
        parseNumTitle: (f, idx) => {
            // e.g. "1 - Saga Saiyajins/01.Aparece un mini Gokū, su nombre es Gohan.mp4"
            const filename = path.basename(f.name).replace(/\.mp4$/i, '').trim();
            const m = filename.match(/^(\d+)[\.\s-]*(.*)$/);
            const num = m ? parseInt(m[1], 10) : (idx + 1);
            let epTitle = m && m[2] ? m[2].trim() : filename;
            const padNum = num < 10 ? '0' + num : '' + num;
            return {
                num: num,
                title: `Cap. ${padNum} - ${epTitle || 'Episodio ' + num}`
            };
        },
        maxEpisodes: 36
    },
    {
        id: 24,
        slug: 'caballeros-del-zodiaco',
        name: 'Caballeros del Zodiaco (24/7)',
        seriesTitle: 'Caballeros del Zodiaco',
        archiveId: 'yk-saint-seiya-024-d-01-b-41-c-1',
        filter: (f) => f.name.endsWith('.mp4') && !f.name.endsWith('.ia.mp4') && f.name.includes('Saint Seiya - ') && (f.size > 20 * 1024 * 1024),
        parseNumTitle: (f, idx) => {
            // e.g. "[YK]  Saint Seiya - 001 [D80DFE63] .mp4"
            const filename = path.basename(f.name);
            const m = filename.match(/Saint\s+Seiya\s*-\s*(\d+)/i);
            const num = m ? parseInt(m[1], 10) : (idx + 1);
            const padNum = num < 10 ? '0' + num : (num < 100 ? '' + num : '' + num);
            return {
                num: num,
                title: `Cap. ${padNum} - Episodio ${num}`
            };
        },
        maxEpisodes: 50
    },
    {
        id: 25,
        slug: 'supercampeones',
        name: 'Supercampeones (24/7)',
        seriesTitle: 'Supercampeones',
        archiveId: 'super-campeones-1983-latino',
        filter: (f) => f.name.endsWith('.mp4') && !f.name.endsWith('.ia.mp4') && (f.size > 20 * 1024 * 1024),
        parseNumTitle: (f, idx) => {
            // e.g. "Super Campeones - 001 - El Desafio.mp4"
            const filename = path.basename(f.name).replace(/\.mp4$/i, '').trim();
            const parts = filename.split('-').map(p => p.trim());
            let num = idx + 1;
            let epTitle = '';
            if (parts.length >= 3) {
                const parsedNum = parseInt(parts[1], 10);
                if (!isNaN(parsedNum)) num = parsedNum;
                epTitle = parts.slice(2).join(' - ');
            } else {
                epTitle = filename;
            }
            const padNum = num < 10 ? '0' + num : '' + num;
            return {
                num: num,
                title: `Cap. ${padNum} - ${epTitle || 'Episodio ' + num}`
            };
        },
        maxEpisodes: 30
    },
    {
        id: 26,
        slug: 'death-note',
        name: 'Death Note (24/7)',
        seriesTitle: 'Death Note',
        archiveId: 'Death-Note-Latino',
        filter: (f) => f.name.endsWith('.mp4') && !f.name.endsWith('.ia.mp4') && (f.size > 20 * 1024 * 1024),
        parseNumTitle: (f, idx) => {
            // e.g. "S01E01-Renacimiento.mp4"
            const filename = path.basename(f.name).replace(/\.mp4$/i, '').trim();
            const m = filename.match(/E(\d+)[-_](.*)/i);
            const num = m ? parseInt(m[1], 10) : (idx + 1);
            const epTitle = m && m[2] ? m[2].trim() : filename;
            const padNum = num < 10 ? '0' + num : '' + num;
            return {
                num: num,
                title: `Cap. ${padNum} - ${epTitle || 'Episodio ' + num}`
            };
        },
        maxEpisodes: 37
    }
];

async function verifyUrl(url) {
    try {
        const res = await fetch(url, {
            method: 'HEAD',
            headers: {
                'Range': 'bytes=0-1024',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            signal: AbortSignal.timeout(5000)
        });
        return res.status === 200 || res.status === 206;
    } catch (e) {
        return false;
    }
}

async function fetchSeriesEpisodes(seriesConf) {
    console.log(`\n[ARCHIVE] Obteniendo metadata para ${seriesConf.seriesTitle} (${seriesConf.archiveId})...`);
    const metaUrl = `https://archive.org/metadata/${seriesConf.archiveId}/files`;
    const res = await fetch(metaUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${metaUrl}`);
    const data = await res.json();
    const rawFiles = (data.result || []).filter(seriesConf.filter);

    console.log(`  Encontrados ${rawFiles.length} archivos MP4 potenciales.`);

    // Mapear con números y títulos
    const mapped = rawFiles.map((f, idx) => {
        const parsed = seriesConf.parseNumTitle(f, idx);
        // Codificar partes de la ruta para la URL de descarga
        const encodedPath = f.name.split('/').map(segment => encodeURIComponent(segment)).join('/');
        const downloadUrl = `https://archive.org/download/${seriesConf.archiveId}/${encodedPath}`;
        return {
            num: parsed.num,
            title: parsed.title,
            rawName: f.name,
            url: downloadUrl
        };
    });

    // Ordenar por número de capítulo
    mapped.sort((a, b) => a.num - b.num);

    // Limitar al número máximo configurado
    const selected = mapped.slice(0, seriesConf.maxEpisodes);

    // Verificar las URLs principales (probando al menos las primeras 3 y una muestra para asegurar validez)
    console.log(`  Verificando conectividad HTTP 200/206 para ${selected.length} episodios...`);
    const verifiedEpisodes = [];

    // Verificamos en paralelo con batches de 5
    for (let i = 0; i < selected.length; i += 5) {
        const batch = selected.slice(i, i + 5);
        const checks = await Promise.all(batch.map(async ep => {
            const ok = await verifyUrl(ep.url);
            return ok ? ep : null;
        }));
        checks.forEach(ep => {
            if (ep) {
                verifiedEpisodes.push({
                    num: ep.num,
                    title: ep.title,
                    url: ep.url
                });
            }
        });
    }

    console.log(`  ✓ ${verifiedEpisodes.length} episodios verificados y activos para ${seriesConf.seriesTitle}.`);
    return {
        id: seriesConf.id,
        slug: seriesConf.slug,
        name: seriesConf.name,
        seriesTitle: seriesConf.seriesTitle,
        category: 'SERIES Y ANIME',
        urls: verifiedEpisodes.length > 0 ? [verifiedEpisodes[0].url] : [],
        episodes: verifiedEpisodes
    };
}

async function main() {
    console.log('=== JANDOS-TV: FETCH SERIES Y ANIME 24/7 (INTERNET ARCHIVE) ===\n');

    const catalogo = [];

    for (const conf of SERIES_CONFIG) {
        try {
            const seriesData = await fetchSeriesEpisodes(conf);
            catalogo.push(seriesData);
        } catch (err) {
            console.error(`Error procesando serie ${conf.name}:`, err.message);
        }
    }

    // 1. Guardar series-catalogo.json
    const catalogoPath = path.join(__dirname, 'series-catalogo.json');
    const catalogoJson = {
        updated: new Date().toISOString().split('T')[0],
        totalSeries: catalogo.length,
        series: catalogo
    };
    fs.writeFileSync(catalogoPath, JSON.stringify(catalogoJson, null, 2), 'utf-8');
    console.log(`\n✓ Archivo guardado con éxito: ${catalogoPath}`);

    // 2. Actualizar canales-remotos.json integrando los canales 21 a 26 inmediatamente después de Deportes
    const remotosPath = path.join(__dirname, 'canales-remotos.json');
    if (fs.existsSync(remotosPath)) {
        try {
            const remotosData = JSON.parse(fs.readFileSync(remotosPath, 'utf-8'));
            const oldChannels = remotosData.channels || [];

            // Filtrar canales existentes:
            // - Mantener Nacionales (1-12)
            // - Mantener Deportes (13-20 o Deportes existentes)
            // - Descartar cualquier canal previo de SERIES Y ANIME para reemplazarlos con los nuevos
            // - Mantener Cine y Cultura, Dibujos y Animación, Regionales
            const nacionales = oldChannels.filter(c => c.category === 'NACIONALES').slice(0, 12);
            const allDeportes = oldChannels.filter(c => c.category === 'DEPORTES');
            const deportes = allDeportes.slice(0, 8);
            const extraDeportes = allDeportes.slice(8);
            const resto = [
                ...extraDeportes,
                ...oldChannels.filter(c => c.category !== 'NACIONALES' && c.category !== 'DEPORTES' && c.category !== 'SERIES Y ANIME')
            ];

            // Crear los 6 canales de SERIES Y ANIME (21 a 26)
            const seriesChannels = catalogo.map((s, idx) => ({
                id: 21 + idx,
                name: s.name,
                category: 'SERIES Y ANIME',
                urls: s.urls,
                episodes: s.episodes
            }));

            // Re-ensamblar canales con IDs secuenciales
            let currentId = 1;
            const newChannels = [];

            nacionales.forEach(c => {
                c.id = currentId++;
                newChannels.push(c);
            });

            deportes.forEach(c => {
                c.id = currentId++;
                newChannels.push(c);
            });

            seriesChannels.forEach(c => {
                c.id = currentId++;
                newChannels.push(c);
            });

            resto.forEach(c => {
                c.id = currentId++;
                newChannels.push(c);
            });

            remotosData.channels = newChannels;
            remotosData.totalChannels = newChannels.length;
            remotosData.updated = new Date().toISOString().split('T')[0];

            fs.writeFileSync(remotosPath, JSON.stringify(remotosData, null, 2), 'utf-8');
            console.log(`✓ 'canales-remotos.json' actualizado con los 6 canales de Series y Anime en las posiciones 21-26.`);
        } catch (e) {
            console.error('Error actualizando canales-remotos.json:', e);
        }
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error('Error fatal en fetch-series-archive.js:', err);
        process.exit(1);
    });
}

module.exports = { SERIES_CONFIG, fetchSeriesEpisodes };
