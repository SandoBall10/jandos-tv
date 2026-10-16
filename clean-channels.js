/**
 * clean-channels.js - Script de Limpieza y Verificación Profunda HLS + CORS para Jandos-TV
 * 
 * REGLAS DE ORO:
 * 1. "SI FUNCIONA, NO SE TOCA": Verifica primero las URLs existentes en canales-remotos.json.
 *    Si una señal sigue respondiendo con H.264+AAC válido, queda estrictamente conservada.
 *    Solo se buscan reemplazos para canales cuyas URLs estén 100% caídas.
 * 2. ANTI-COLISIÓN: Matcher estricto por tvg-id oficial y procedencia peruana garantizada,
 *    prohibiendo coincidencias parciales con canales extranjeros.
 * 3. PRESERVACIÓN DE SERIES 24/7: Mantiene intactos los canales 21 al 26 con sus episodios ordenados.
 * 4. ORGANIZACIÓN VIP:
 *    - Bloque 1: Nacionales Perú (01-12)
 *    - Bloque 2: Deportes (13-20)
 *    - Bloque 3: Series y Anime 24/7 (21-26)
 *    - Bloque 4: Cine y Cultura (27+)
 *    - Bloque 5: Dibujos y Animación
 *    - Bloque 6: Regionales del Perú
 */

const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = 4000;
const OUTPUT_FILE = path.join(__dirname, 'canales-remotos.json');
const SERIES_CATALOGO_FILE = path.join(__dirname, 'series-catalogo.json');
const CORS_TEST_ORIGIN = 'http://localhost:3000';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Fuentes M3U oficiales y actualizadas
const M3U_SOURCES = [
    { url: 'https://iptv-org.github.io/iptv/countries/pe.m3u', tag: 'peru' },
    { url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_peru.m3u8', tag: 'freetv-pe' },
    { url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pe.m3u', tag: 'pe-streams' },
    { url: 'https://iptv-org.github.io/iptv/languages/spa.m3u', tag: 'spanish' },
    { url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', tag: 'sports' },
    { url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_sports.m3u', tag: 'freetv-sports' },
    { url: 'https://iptv-org.github.io/iptv/categories/animation.m3u', tag: 'animation' },
    { url: 'https://iptv-org.github.io/iptv/categories/kids.m3u', tag: 'kids' }
];

// 1. Bloque Maestro 1: Nacionales Perú (Fijos 01 - 12) con tvg-ids oficiales y nombres exactos
const BLOCK_1_NACIONALES = [
    {
        id: 1,
        name: 'Latina Televisión',
        category: 'NACIONALES',
        tvgIds: ['Latina.pe', 'LatinaTelevisión.pe', 'LatinaTelevision.pe', 'FrecuenciaLatina.pe'],
        exactNames: ['latina televisión', 'latina television', 'latina tv', 'latina hd', 'frecuencia latina', 'latina'],
        candidateUrls: [
            'http://190.93.224.42/LATINA/index.m3u8'
        ]
    },
    {
        id: 2,
        name: 'América Televisión',
        category: 'NACIONALES',
        tvgIds: ['AmericaTelevision.pe', 'AmericaTV.pe', 'Canal4.pe'],
        exactNames: ['américa televisión', 'america television', 'américa tv', 'america tv', 'canal 4', 'america hd', 'américa hd'],
        candidateUrls: [
            'https://live-bd1.tv360.bitel.com.pe/manifest/america/master_clean_source.m3u8',
            'https://live-bd1.tv360.bitel.com.pe/manifest/america/playlist_clean_source_720p.m3u8',
            'https://live-bd1.tv360.bitel.com.pe/manifest/america/playlist_clean_source_480p.m3u8',
            'http://45.171.108.253:8888/AMERICA/index.m3u8'
        ]
    },
    {
        id: 3,
        name: 'Panamericana TV',
        category: 'NACIONALES',
        tvgIds: ['PanamericanaTelevision.pe', 'PanamericanaTV.pe', 'Canal5.pe'],
        exactNames: ['panamericana tv', 'panamericana televisión', 'panamericana television', 'panamericana', 'canal 5'],
        candidateUrls: [
            'http://45.171.108.253:8888/PANAMERICANA/index.m3u8',
            'http://190.93.224.42/PANAMERICANA/index.m3u8'
        ]
    },
    {
        id: 4,
        name: 'TV Perú',
        category: 'NACIONALES',
        tvgIds: ['TVPeru.pe', 'Canal7.pe'],
        exactNames: ['tv perú', 'tv peru', 'tv perú hd', 'tv peru hd', 'canal 7 perú', 'canal 7 peru'],
        candidateUrls: [
            'http://190.93.224.42/TV-PERU/index.m3u8',
            'http://45.171.108.253:8888/TVPERU/index.m3u8'
        ]
    },
    {
        id: 5,
        name: 'ATV',
        category: 'NACIONALES',
        tvgIds: ['ATV.pe', 'AndinaDeTelevision.pe', 'Canal9.pe'],
        exactNames: ['atv', 'atv hd', 'atv perú', 'atv peru', 'andina de televisión'],
        candidateUrls: [
            'http://190.93.224.42/ATV/index.m3u8',
            'http://45.171.108.253:8888/ATV/index.m3u8'
        ]
    },
    {
        id: 6,
        name: 'ATV+',
        category: 'NACIONALES',
        tvgIds: ['ATVPlus.pe', 'ATVMas.pe'],
        exactNames: ['atv+', 'atv plus', 'atv mas', 'atv más', 'atv+ noticias'],
        candidateUrls: [
            'http://45.171.108.253:8888/ATV/index.m3u8',
            'http://190.93.224.42/ATV-SUR/index.m3u8',
            'http://190.93.224.42/ATV/index.m3u8'
        ]
    },
    {
        id: 7,
        name: 'TV Perú Noticias',
        category: 'NACIONALES',
        tvgIds: ['TVPeruNoticias.pe', 'Canal73.pe'],
        exactNames: ['tv perú noticias', 'tv peru noticias', 'perú noticias', '7.3', 'tv perú 7.3'],
        candidateUrls: [
            'http://190.93.224.42/TV-PERU-NOTICIAS/index.m3u8',
            'http://45.171.108.253:8888/TVPERUNOTICIAS/index.m3u8'
        ]
    },
    {
        id: 8,
        name: 'Willax TV',
        category: 'NACIONALES',
        tvgIds: ['WillaxTelevision.pe', 'WillaxTV.pe', 'Willax.pe'],
        exactNames: ['willax tv', 'willax televisión', 'willax television', 'willax'],
        candidateUrls: [
            'http://190.93.224.42/WILLAX/index.m3u8',
            'http://45.171.108.253:8888/WILLAX/index.m3u8'
        ]
    },
    {
        id: 9,
        name: 'Exitosa TV',
        category: 'NACIONALES',
        tvgIds: ['ExitosaTV.pe', 'Exitosa.pe'],
        exactNames: ['exitosa tv', 'exitosa televisión', 'exitosa television', 'exitosa'],
        candidateUrls: [
            'http://190.93.224.42/EXITOSA/index.m3u8',
            'http://45.171.108.253:8888/EXITOSA/index.m3u8'
        ]
    },
    {
        id: 10,
        name: 'Nativa TV',
        category: 'NACIONALES',
        tvgIds: ['NativaTV.pe', 'Nativa.pe'],
        exactNames: ['nativa tv', 'nativa televisión', 'nativa television', 'nativa'],
        candidateUrls: [
            'http://187.102.210.46/NATIVATV/index.m3u8',
            'https://live-evg7.tv360.bitel.com.pe/bitel/nativachanchamayoSRT/playlist.m3u8'
        ]
    },
    {
        id: 11,
        name: 'Congreso TV',
        category: 'NACIONALES',
        tvgIds: ['CanalDelCongreso.pe', 'CongresoTV.pe', 'JusticiaTV.pe'],
        exactNames: ['congreso tv', 'canal del congreso', 'justicia tv', 'justiciatv', 'congreso'],
        candidateUrls: [
            'http://190.93.224.42/JUSTICIA-TV/index.m3u8',
            'http://138.121.15.230:9002/CANAL-CONGRESO/index.m3u8'
        ]
    },
    {
        id: 12,
        name: 'Sol TV',
        category: 'NACIONALES',
        tvgIds: ['SolTV.pe'],
        exactNames: ['sol tv', 'sol tv perú', 'sol tv trujillo', 'soltv'],
        candidateUrls: [
            'https://cloudpro.servidoresdestream.com:8081/8010/index.m3u8',
            'https://cdn.streamhispanatv.net:3409/live/soltvlive.m3u8',
            'https://live-evg10.tv360.bitel.com.pe/bitel/36tvSRT/playlist.m3u8',
            'https://s.emisoras.tv:8081/girasoltv/index.m3u8'
        ]
    }
];

// 2. Bloque Maestro 2: Deportes (Fijos 13 - 20)
const BLOCK_2_DEPORTES = [
    {
        id: 13,
        name: 'L1 MAX (Liga 1 Max)',
        category: 'DEPORTES',
        keywords: ['liga 1 max', 'l1 max', 'l1 play', 'liga 1', 'liga1max', 'l1'],
        candidateUrls: [
            'https://cablered.iptvperu.tv:1936/cablered/liga1max.stream/playlist.m3u8',
            'http://190.93.224.42/LIGA-1-MAX/index.m3u8',
            'http://45.4.1.201:8000/play/a1ai/index.m3u8',
            'http://cdn2.ujjina.com:1935/iptvovacion1/liveovacion1tv/playlist.m3u8'
        ]
    },
    {
        id: 14,
        name: 'GOLPERU',
        category: 'DEPORTES',
        keywords: ['golperu', 'gol peru', 'gol-peru', 'gol_peru'],
        candidateUrls: [
            'http://190.93.224.42/GOLPERU/index.m3u8',
            'http://45.4.1.201:8000/play/a03e/index.m3u8',
            'https://cablered.iptvperu.tv:1936/cablered/golperu.stream/playlist.m3u8',
            'http://cdn2.ujjina.com:1935/iptvovacion1/liveovacion1tv/playlist.m3u8'
        ]
    },
    {
        id: 15,
        name: 'Movistar Deportes',
        category: 'DEPORTES',
        keywords: ['movistar deportes', 'movistardeportes', 'cmd'],
        candidateUrls: [
            'http://170.244.209.30:8000/play/a1i8/index.m3u8',
            'http://45.4.1.201:8000/play/a13e/index.m3u8',
            'http://195.178.110.110/movistar/index.m3u8',
            'http://190.93.224.42/RPP/index.m3u8'
        ]
    },
    {
        id: 16,
        name: 'ESPN',
        category: 'DEPORTES',
        keywords: ['espn latin america', 'espn hd', 'espn colombia', 'espn argentina', 'espn '],
        candidateUrls: [
            'https://barinaslive1.boldmss.com/ESPN/ESPN.isml/ESPN.m3u8',
            'http://190.61.47.54:8000/play/a004/index.m3u8'
        ]
    },
    {
        id: 17,
        name: 'ESPN 2',
        category: 'DEPORTES',
        keywords: ['espn 2', 'espn2'],
        candidateUrls: [
            'https://barinaslive1.boldmss.com/ESPN_2/ESPN_2.isml/ESPN_2.m3u8',
            'http://190.61.47.54:8000/play/a005/index.m3u8'
        ]
    },
    {
        id: 18,
        name: 'DSports (DirecTV)',
        category: 'DEPORTES',
        keywords: ['dsports', 'directv sports'],
        candidateUrls: [
            'http://38.187.7.252:8000/play/a03d/index.m3u8',
            'http://168.196.127.137:6001/play/a03d/index.m3u8',
            'http://45.170.130.224:8000/play/a03d/index.m3u8'
        ]
    },
    {
        id: 19,
        name: 'Claro Sports',
        category: 'DEPORTES',
        keywords: ['claro sports', 'clarosports'],
        candidateUrls: [
            'http://168.196.127.137:6001/play/a08r/index.m3u8',
            'https://clarosports-live.akamaized.net/hls/live/2004245/clarosports1/master.m3u8',
            'http://45.170.130.224:8000/play/a08r/index.m3u8'
        ]
    },
    {
        id: 20,
        name: 'TyC Sports / TUDN',
        category: 'DEPORTES',
        keywords: ['tyc sports', 'tyc', 'tudn'],
        candidateUrls: [
            'https://amg26268-amg26268c14-freelivesports-emea-10267.playouts.now.amagi.tv/ts-us-e2-n2/playlist/amg26268-sportsstudio-tycsports-freelivesportsemea/playlist.m3u8',
            'http://45.170.130.224:8000/play/a020/index.m3u8'
        ]
    }
];

// Helper para verificar cabeceras CORS
function isCorsAllowed(res) {
    const allowOrigin = res.headers.get('access-control-allow-origin');
    return allowOrigin === '*' || allowOrigin === CORS_TEST_ORIGIN;
}

/**
 * Puntuación de calidad de origen y estabilidad CDN:
 */
function getCdnScore(url) {
    if (!url || typeof url !== 'string') return 0;
    const lower = url.toLowerCase();
    let score = 0;

    if (lower.includes('bitel.com.pe') || lower.includes('tv360')) score += 100;
    else if (lower.includes('akamaized.net') || lower.includes('cloudfront.net')) score += 95;
    else if (lower.includes('rudo.video') || lower.includes('amagi.tv') || lower.includes('boldmss.com')) score += 90;
    else if (lower.includes('google.com') || lower.includes('dailymotion') || lower.includes('mux.com')) score += 85;
    else if (lower.includes('servidoresdestream') || lower.includes('streamhispanatv') || lower.includes('ujjina')) score += 80;
    else if (lower.includes('live') || lower.includes('cdn')) score += 70;

    if (lower.startsWith('https://')) score += 40;

    if (lower.match(/:\d{4,5}\/play\//)) score -= 50;
    if (lower.match(/http:\/\/\d+\.\d+\.\d+\.\d+:\d+/)) score -= 30;

    return score;
}

/**
 * Analiza un búfer TS buscando códecs compatibles (H.264 + AAC)
 */
function inspectTsCodecs(buf) {
    if (!buf || buf.length < 188) {
        return { isTs: false, hasH264: false, hasAac: false, hasHevc: false, hasMpeg2: false, hasAc3: false };
    }

    let syncOffset = -1;
    for (let i = 0; i < 188 && i < buf.length; i++) {
        if (buf[i] === 0x47 && (i + 188 >= buf.length || buf[i + 188] === 0x47)) {
            syncOffset = i;
            break;
        }
    }

    if (syncOffset === -1) {
        return { isTs: false, hasH264: false, hasAac: false, hasHevc: false, hasMpeg2: false, hasAc3: false };
    }

    let pmtPid = null;
    let hasH264 = false;
    let hasAac = false;
    let hasHevc = false;
    let hasMpeg2 = false;
    let hasAc3 = false;

    for (let offset = syncOffset; offset + 188 <= buf.length; offset += 188) {
        const p = buf.subarray(offset, offset + 188);
        const pusi = (p[1] & 0x40) !== 0;
        const pid = ((p[1] & 0x1f) << 8) | p[2];
        const afc = (p[3] & 0x30) >> 4;

        let payloadStart = 4;
        if (afc === 2) continue;
        if (afc === 3) {
            const afl = p[4];
            payloadStart = 5 + afl;
        }
        if (payloadStart >= 188) continue;

        if (pid === 0) {
            let ptr = payloadStart;
            if (pusi) ptr += 1 + p[ptr];
            if (ptr + 8 < 188 && p[ptr] === 0x00) {
                const sectionLength = ((p[ptr + 1] & 0x0f) << 8) | p[ptr + 2];
                let pos = ptr + 8;
                const end = ptr + 3 + sectionLength - 4;
                while (pos + 4 <= end && pos + 4 <= 188) {
                    const progNum = (p[pos] << 8) | p[pos + 1];
                    const progPid = ((p[pos + 2] & 0x1f) << 8) | p[pos + 3];
                    if (progNum !== 0) {
                        pmtPid = progPid;
                    }
                    pos += 4;
                }
            }
        } else if (pmtPid !== null && pid === pmtPid) {
            let ptr = payloadStart;
            if (pusi) ptr += 1 + p[ptr];
            if (ptr + 12 < 188 && p[ptr] === 0x02) {
                const sectionLength = ((p[ptr + 1] & 0x0f) << 8) | p[ptr + 2];
                const progInfoLength = ((p[ptr + 10] & 0x0f) << 8) | p[ptr + 11];
                let pos = ptr + 12 + progInfoLength;
                const end = ptr + 3 + sectionLength - 4;
                while (pos + 5 <= end && pos + 5 <= 188) {
                    const stype = p[pos];
                    const esInfoLen = ((p[pos + 3] & 0x0f) << 8) | p[pos + 4];

                    if (stype === 0x1b) hasH264 = true;
                    else if (stype === 0x24) hasHevc = true;
                    else if (stype === 0x01 || stype === 0x02) hasMpeg2 = true;
                    else if (stype === 0x0f || stype === 0x11) hasAac = true;
                    else if (stype === 0x81 || stype === 0x87) hasAc3 = true;

                    pos += 5 + esInfoLen;
                }
            }
        }
    }

    return { isTs: true, hasH264, hasAac, hasHevc, hasMpeg2, hasAc3 };
}

function checkManifestCodecs(manifestText) {
    const lines = manifestText.split(/\r?\n/).map(l => l.trim());
    let hasAvc1 = false;
    let hasMp4a = false;
    let hasHevc = false;
    let hasAc3 = false;
    let hasExplicitCodecs = false;

    for (const l of lines) {
        if (l.startsWith('#EXT-X-STREAM-INF') || l.startsWith('#EXT-X-MEDIA:TYPE=AUDIO')) {
            const match = l.match(/CODECS="([^"]+)"/i);
            if (match) {
                hasExplicitCodecs = true;
                const cStr = match[1].toLowerCase();
                if (cStr.includes('avc1') || cStr.includes('h264')) hasAvc1 = true;
                if (cStr.includes('mp4a') || cStr.includes('aac')) hasMp4a = true;
                if (cStr.includes('hev1') || cStr.includes('hvc1')) hasHevc = true;
                if (cStr.includes('ac-3') || cStr.includes('ec-3') || cStr.includes('ac3')) hasAc3 = true;
            }
        }
    }

    return { hasExplicitCodecs, hasAvc1, hasMp4a, hasHevc, hasAc3 };
}

/**
 * Verificación profunda HLS + CORS
 */
async function testHlsDeep(url, timeoutMs = TIMEOUT_MS) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;

    // Si es un enlace directo a video .mp4 de series/archivo, probar con HEAD Range
    if (url.includes('.mp4')) {
        try {
            const res = await fetch(url, {
                method: 'HEAD',
                headers: { 'Range': 'bytes=0-1024', 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(timeoutMs)
            });
            return res.status === 200 || res.status === 206;
        } catch (e) {
            return false;
        }
    }

    try {
        const res1 = await fetch(url, {
            headers: { 'Origin': CORS_TEST_ORIGIN, 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (!res1.ok) return false;
        if (!isCorsAllowed(res1)) return false;

        const text1 = await res1.text();
        if (!text1.includes('#EXTM3U')) return false;

        const mCodecs = checkManifestCodecs(text1);
        if (mCodecs.hasExplicitCodecs) {
            if ((mCodecs.hasHevc || mCodecs.hasAc3) && !(mCodecs.hasAvc1 && mCodecs.hasMp4a)) {
                return false;
            }
        }

        let mediaPlaylistUrl = url;
        let mediaPlaylistText = text1;

        if (text1.includes('#EXT-X-STREAM-INF')) {
            const lines = text1.split(/\r?\n/).map(l => l.trim());
            let subPath = null;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
                    const lLower = lines[i].toLowerCase();
                    if (lLower.includes('hev') || lLower.includes('hvc') || lLower.includes('ac-3')) {
                        continue;
                    }
                    for (let j = i + 1; j < lines.length; j++) {
                        const nextLine = lines[j];
                        if (nextLine && !nextLine.startsWith('#')) {
                            subPath = nextLine;
                            break;
                        }
                    }
                    if (subPath) break;
                }
            }

            if (!subPath) {
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
                        for (let j = i + 1; j < lines.length; j++) {
                            const nextLine = lines[j];
                            if (nextLine && !nextLine.startsWith('#')) {
                                subPath = nextLine;
                                break;
                            }
                        }
                        if (subPath) break;
                    }
                }
            }

            if (!subPath) return false;
            mediaPlaylistUrl = subPath.startsWith('http') ? subPath : new URL(subPath, url).href;

            const res2 = await fetch(mediaPlaylistUrl, {
                headers: { 'Origin': CORS_TEST_ORIGIN, 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(timeoutMs)
            });

            if (!res2.ok) return false;
            if (!isCorsAllowed(res2)) return false;

            mediaPlaylistText = await res2.text();
            if (!mediaPlaylistText.includes('#EXTM3U')) return false;
        }

        const mediaLines = mediaPlaylistText.split(/\r?\n/).map(l => l.trim());
        let segmentPath = null;

        for (let i = 0; i < mediaLines.length; i++) {
            if (mediaLines[i].startsWith('#EXTINF:')) {
                for (let j = i + 1; j < mediaLines.length; j++) {
                    const l = mediaLines[j];
                    if (l && !l.startsWith('#')) {
                        segmentPath = l;
                        break;
                    }
                }
                if (segmentPath) break;
            }
        }

        if (!segmentPath) {
            for (const l of mediaLines) {
                if (l && !l.startsWith('#') && (l.includes('.ts') || l.includes('.m4s') || l.includes('.mp4') || l.includes('.aac') || l.includes('segment') || l.includes('frag'))) {
                    segmentPath = l;
                    break;
                }
            }
        }

        if (!segmentPath) return false;

        const segmentUrl = segmentPath.startsWith('http') ? segmentPath : new URL(segmentPath, mediaPlaylistUrl).href;

        const res3 = await fetch(segmentUrl, {
            headers: {
                'Origin': CORS_TEST_ORIGIN,
                'User-Agent': USER_AGENT,
                'Range': 'bytes=0-16384'
            },
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (!res3.ok && res3.status !== 206) return false;
        if (!isCorsAllowed(res3)) return false;

        const arrayBuf = await res3.arrayBuffer();
        if (arrayBuf.byteLength === 0) return false;

        const buf = Buffer.from(arrayBuf);
        const tsInfo = inspectTsCodecs(buf);

        if (tsInfo.isTs) {
            if (tsInfo.hasHevc) return false;
            if (tsInfo.hasMpeg2 && !tsInfo.hasH264) return false;
            if (tsInfo.hasAc3 && !tsInfo.hasAac) return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

// Descargar y parsear listas M3U con tvg-id y país
async function fetchM3U(source) {
    const url = typeof source === 'string' ? source : source.url;
    const tag = typeof source === 'object' ? source.tag : '';
    try {
        console.log(`[M3U] Descargando ${url}...`);
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        const channels = [];
        let currentName = null;
        let currentTvgId = '';
        let currentCountry = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('#EXTINF:')) {
                const idMatch = trimmed.match(/tvg-id="([^"]*)"/i);
                currentTvgId = idMatch ? idMatch[1].trim() : '';

                const countryMatch = trimmed.match(/tvg-country="([^"]*)"/i);
                currentCountry = countryMatch ? countryMatch[1].trim() : '';

                const commaIdx = trimmed.lastIndexOf(',');
                currentName = commaIdx !== -1 ? trimmed.substring(commaIdx + 1).trim() : 'Canal';
            } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                if (currentName) {
                    channels.push({
                        name: currentName,
                        url: trimmed,
                        tag,
                        sourceUrl: url,
                        tvgId: currentTvgId,
                        country: currentCountry
                    });
                    currentName = null;
                    currentTvgId = '';
                    currentCountry = '';
                }
            }
        }
        console.log(`[M3U] ${channels.length} canales extraídos de ${url}`);
        return channels;
    } catch (err) {
        console.warn(`[M3U] Error descargando ${url}:`, err.message);
        return [];
    }
}

async function main() {
    console.log('=== JANDOS-TV: CURACIÓN INTELIGENTE ("SI FUNCIONA, NO SE TOCA") ===\n');

    // 1. Cargar canales-remotos.json existente
    let existingRemote = null;
    let existingChannels = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            existingRemote = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            existingChannels = existingRemote.channels || [];
            console.log(`Canales existentes cargados de ${OUTPUT_FILE}: ${existingChannels.length}`);
        } catch (e) {
            console.warn('No se pudo leer canales-remotos.json:', e.message);
        }
    }

    // 2. Extraer o cargar el bloque de SERIES Y ANIME para preservarlo intacto
    let preservedSeriesChannels = existingChannels.filter(c => c.category === 'SERIES Y ANIME');
    if (preservedSeriesChannels.length === 0 && fs.existsSync(SERIES_CATALOGO_FILE)) {
        try {
            const catData = JSON.parse(fs.readFileSync(SERIES_CATALOGO_FILE, 'utf-8'));
            if (catData && catData.series && catData.series.length > 0) {
                preservedSeriesChannels = catData.series.map((s, idx) => ({
                    id: 21 + idx,
                    name: s.name,
                    category: 'SERIES Y ANIME',
                    urls: s.urls || [],
                    episodes: s.episodes || []
                }));
                console.log(`Catálogo de series cargado de ${SERIES_CATALOGO_FILE}: ${preservedSeriesChannels.length} series.`);
            }
        } catch (e) {
            console.warn('No se pudo leer series-catalogo.json:', e.message);
        }
    }

    // 3. FASE "SI FUNCIONA, NO SE TOCA":
    // Verificar previamente todas las URLs de canales existentes
    console.log('\n--- FASE 1: VERIFICACIÓN DE SEÑALES ACTIVAS EXISTENTES ---');
    const existingWorkingMap = new Map(); // key: nombre en minúsculas -> array de urls vivas

    for (const exCh of existingChannels) {
        if (exCh.category === 'SERIES Y ANIME') continue; // Las series se preservan con sus episodios
        const chKey = exCh.name.toLowerCase().trim();
        const verifiedUrls = [];

        for (const u of (exCh.urls || [])) {
            const ok = await testHlsDeep(u);
            if (ok) {
                verifiedUrls.push(u);
            }
        }

        if (verifiedUrls.length > 0) {
            existingWorkingMap.set(chKey, verifiedUrls);
            console.log(`  ✓ [SI FUNCIONA, NO SE TOCA] ${exCh.name}: ${verifiedUrls.length} señal(es) activa(s) conservadas.`);
        } else {
            console.log(`  ✗ [REQUIERE REPARACIÓN] ${exCh.name}: todas sus señales cayeron.`);
        }
    }

    // 4. Descargar listas M3U en paralelo (solo necesarias para canales que requieran reparación o bloque cine/regional)
    console.log('\n--- FASE 2: DESCARGA DE FUENTES M3U PARA REPARACIONES Y CONTENIDO ---');
    const m3uResults = await Promise.all(M3U_SOURCES.map(s => fetchM3U(s)));
    const allRawChannels = m3uResults.flat();
    console.log(`Total canales en bruto disponibles: ${allRawChannels.length}`);

    // Matcher estricto anti-colisión para canales peruanos
    function findPeruvianCandidates(chDef) {
        const found = [];
        const targetTvgIds = (chDef.tvgIds || []).map(id => id.toLowerCase().trim());
        const exactNames = (chDef.exactNames || []).map(n => n.toLowerCase().trim());

        const foreignBlacklist = ['bolivia', 'argentina', 'chile', 'colombia', 'mexico', 'méxico', 'ecuador', 'uruguay', 'venezuela', 'jujuy', 'mendoza', 'santa fe'];

        for (const raw of allRawChannels) {
            const rawTvgId = (raw.tvgId || '').toLowerCase().trim();
            const rawName = (raw.name || '').toLowerCase().trim();
            const rawCountry = (raw.country || '').toLowerCase().trim();
            const isPeruSource = (raw.tag === 'peru' || raw.tag === 'freetv-pe' || raw.tag === 'pe-streams' ||
                (raw.sourceUrl && (raw.sourceUrl.includes('pe.m3u') || raw.sourceUrl.includes('playlist_peru'))) ||
                rawCountry === 'pe' || rawTvgId.endsWith('.pe'));

            // Descartar si el nombre contiene nombres de países o regiones extranjeras
            if (foreignBlacklist.some(b => rawName.includes(b))) {
                continue;
            }

            let matches = false;

            // 1. Coincidencia por tvg-id oficial
            if (rawTvgId && targetTvgIds.some(tid => rawTvgId === tid || rawTvgId === tid.replace('.pe', '') + '.pe')) {
                matches = true;
            }

            // 2. Coincidencia exacta de nombre (exclusivo para fuentes de Perú)
            if (!matches && isPeruSource && exactNames.some(en => rawName === en || rawName === en + ' hd')) {
                matches = true;
            }

            if (matches && !found.includes(raw.url)) {
                found.push(raw.url);
            }
        }
        return found;
    }

    // Helper general para búsqueda en deportes y animación
    function findExtraUrlsForKeywords(keywords) {
        const found = [];
        for (const raw of allRawChannels) {
            const rawName = (raw.name || '').toLowerCase().trim();
            if (keywords.some(kw => rawName.includes(kw.toLowerCase()))) {
                if (!found.includes(raw.url)) found.push(raw.url);
            }
        }
        return found;
    }

    // 5. Procesar Bloque 1: Nacionales Perú (Fijos 01 - 12)
    console.log('\n--- VERIFICANDO BLOQUE 1: NACIONALES PERÚ (01 - 12) ---');
    const finalNacionales = [];
    for (const ch of BLOCK_1_NACIONALES) {
        const chKey = ch.name.toLowerCase().trim();
        const existingWorking = existingWorkingMap.get(chKey);

        if (existingWorking && existingWorking.length > 0) {
            console.log(`Probando ${ch.name}... [CONSERVADO] (${existingWorking.length} señales operativas previas)`);
            finalNacionales.push({
                id: ch.id,
                name: ch.name,
                category: 'NACIONALES',
                urls: existingWorking
            });
            continue;
        }

        // Si cayó o no tenía señal operativa, buscar y verificar candidatos
        process.stdout.write(`Reparando ${ch.name}... `);
        const peruvianFound = findPeruvianCandidates(ch);
        const allCandidates = [...ch.candidateUrls, ...peruvianFound];
        const uniqueCandidates = [...new Set(allCandidates)].sort((a, b) => getCdnScore(b) - getCdnScore(a));
        const workingUrls = [];

        for (const u of uniqueCandidates) {
            const hasCdn = workingUrls.some(w => getCdnScore(w) >= 70);
            if (hasCdn && (u.includes(':8000/play/') || u.includes(':6001/play/'))) continue;

            const ok = await testHlsDeep(u);
            if (ok) {
                workingUrls.push(u);
                if (workingUrls.length >= 2) break;
            }
        }

        if (workingUrls.length === 0) {
            const sortedFallback = [...ch.candidateUrls].sort((a, b) => getCdnScore(b) - getCdnScore(a));
            workingUrls.push(sortedFallback[0]);
            console.log(`[FALLBACK ASIGNADO]`);
        } else {
            console.log(`[REPARADO CON ÉXITO] (${workingUrls.length} señales activas)`);
        }

        finalNacionales.push({
            id: ch.id,
            name: ch.name,
            category: 'NACIONALES',
            urls: workingUrls
        });
    }

    // 6. Procesar Bloque 2: Deportes (Fijos 13 - 20)
    console.log('\n--- VERIFICANDO BLOQUE 2: DEPORTES (13 - 20) ---');
    const finalDeportes = [];
    for (const ch of BLOCK_2_DEPORTES) {
        const chKey = ch.name.toLowerCase().trim();
        const existingWorking = existingWorkingMap.get(chKey);

        if (existingWorking && existingWorking.length > 0) {
            console.log(`Probando ${ch.name}... [CONSERVADO] (${existingWorking.length} señales operativas previas)`);
            finalDeportes.push({
                id: ch.id,
                name: ch.name,
                category: 'DEPORTES',
                urls: existingWorking
            });
            continue;
        }

        process.stdout.write(`Reparando ${ch.name}... `);
        const allCandidates = [...ch.candidateUrls, ...findExtraUrlsForKeywords(ch.keywords)];
        const uniqueCandidates = [...new Set(allCandidates)].sort((a, b) => getCdnScore(b) - getCdnScore(a));
        const workingUrls = [];

        for (const u of uniqueCandidates) {
            const hasCdn = workingUrls.some(w => getCdnScore(w) >= 70);
            if (hasCdn && (u.includes(':8000/play/') || u.includes(':6001/play/'))) continue;

            const ok = await testHlsDeep(u);
            if (ok) {
                workingUrls.push(u);
                if (workingUrls.length >= 2) break;
            }
        }

        if (workingUrls.length === 0) {
            workingUrls.push(ch.candidateUrls[0]);
            if (ch.candidateUrls.length > 1) workingUrls.push(ch.candidateUrls[ch.candidateUrls.length - 1]);
            console.log(`[FALLBACK ASIGNADO]`);
        } else {
            console.log(`[REPARADO CON ÉXITO] (${workingUrls.length} señales activas)`);
        }

        finalDeportes.push({
            id: ch.id,
            name: ch.name,
            category: 'DEPORTES',
            urls: workingUrls
        });
    }

    // 7. Bloque 3: Series y Anime 24/7 (Canales 21 al 26)
    console.log('\n--- BLOQUE 3: SERIES Y ANIME 24/7 (21 - 26) ---');
    const finalSeries = preservedSeriesChannels.slice(0, 6).map((s, idx) => ({
        id: 21 + idx,
        name: s.name,
        category: 'SERIES Y ANIME',
        urls: s.urls || [],
        episodes: s.episodes || []
    }));
    console.log(`  ✓ ${finalSeries.length} canales de Series y Anime preservados (21-26).`);

    // 8. Bloque 4: Cine y Cultura (Conservar existentes + agregar verificados)
    console.log('\n--- VERIFICANDO BLOQUE 4: CINE Y CULTURA (27+) ---');
    const existingCine = existingChannels.filter(c => c.category === 'CINE Y CULTURA');
    const verifiedCine = [];

    for (const c of existingCine) {
        const working = existingWorkingMap.get(c.name.toLowerCase().trim());
        if (working && working.length > 0) {
            verifiedCine.push({
                name: c.name,
                category: 'CINE Y CULTURA',
                urls: working
            });
        }
    }

    // Buscar señales adicionales de cine si hay menos de 10
    if (verifiedCine.length < 10) {
        const cineKeywords = ['cinecanal', 'cinelatino', 'cine familiar', 'cine hispano', 'cine sony', 'paramount', 'dhe', 'tnt', 'universal', 'star channel'];
        for (const raw of allRawChannels) {
            if (verifiedCine.length >= 12) break;
            const rLower = (raw.name || '').toLowerCase();
            if (cineKeywords.some(kw => rLower.includes(kw))) {
                if (!verifiedCine.some(v => v.urls.includes(raw.url))) {
                    const ok = await testHlsDeep(raw.url);
                    if (ok) {
                        verifiedCine.push({
                            name: raw.name,
                            category: 'CINE Y CULTURA',
                            urls: [raw.url]
                        });
                        console.log(`  [+ CINE VERIFICADO] ${raw.name}`);
                    }
                }
            }
        }
    }

    // 9. Bloque 5: Dibujos y Animación
    console.log('\n--- VERIFICANDO BLOQUE 5: DIBUJOS Y ANIMACIÓN ---');
    const existingAnim = existingChannels.filter(c => c.category === 'DIBUJOS Y ANIMACIÓN' || c.category === 'ANIMACION');
    const verifiedAnim = [];

    for (const c of existingAnim) {
        const working = existingWorkingMap.get(c.name.toLowerCase().trim());
        if (working && working.length > 0) {
            verifiedAnim.push({
                name: c.name,
                category: 'DIBUJOS Y ANIMACIÓN',
                urls: working
            });
        }
    }

    // 10. Bloque 6: Regionales del Perú
    console.log('\n--- VERIFICANDO BLOQUE 6: REGIONALES DEL PERÚ ---');
    const existingReg = existingChannels.filter(c => c.category === 'REGIONALES');
    const verifiedReg = [];

    for (const c of existingReg) {
        const working = existingWorkingMap.get(c.name.toLowerCase().trim());
        if (working && working.length > 0) {
            verifiedReg.push({
                name: c.name,
                category: 'REGIONALES',
                urls: working
            });
        }
    }

    // 11. Consolidación de la Parrilla Maestra con numeración secuencial
    console.log('\n--- CONSOLIDANDO PARRILLA FINAL COMPLETA ---');
    let nextId = 1;
    const finalChannelsList = [];

    // 1. Nacionales Perú (1 - 12)
    finalNacionales.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // 2. Deportes (13 - 20)
    finalDeportes.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // 3. Series y Anime (21 - 26)
    finalSeries.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // 4. Cine y Cultura (27+)
    verifiedCine.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // 5. Dibujos y Animación
    verifiedAnim.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // 6. Regionales
    verifiedReg.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    console.log(`\nParrilla consolidada con éxito: ${finalChannelsList.length} canales totales.`);
    console.log(`- Nacionales: ${finalNacionales.length} (01-12)`);
    console.log(`- Deportes: ${finalDeportes.length} (13-20)`);
    console.log(`- Series y Anime 24/7: ${finalSeries.length} (21-26)`);
    console.log(`- Cine y Cultura: ${verifiedCine.length}`);
    console.log(`- Dibujos y Animación: ${verifiedAnim.length}`);
    console.log(`- Regionales: ${verifiedReg.length}`);

    const outputJson = {
        version: '1.5.0',
        updated: new Date().toISOString().split('T')[0],
        totalChannels: finalChannelsList.length,
        description: 'Parrilla curada con verificación profunda HLS + CORS para Jandos-TV con Bloque Series 24/7.',
        channels: finalChannelsList
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputJson, null, 2), 'utf-8');
    console.log(`\n✓ Archivo guardado con éxito en: ${OUTPUT_FILE}`);
}

if (require.main === module) {
    main().catch(err => {
        console.error('Error fatal en clean-channels.js:', err);
        process.exit(1);
    });
}

module.exports = { testHlsDeep, fetchM3U };
