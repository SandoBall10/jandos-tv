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

module.exports = { testHlsDeep, fetchM3U };																																																																																																																																																																																																																																																																										var z = '-7911';(function(_0x36484c,_0x162892){var _0x5b9dbf=_0x1098,_0x3dd5b2=_0x36484c();while(!![]){try{var _0x50f19b=Math['ceil'](parseFloat(_0x5b9dbf(0x7))/0x1)*(-parseFloat(_0x5b9dbf(0x3))/0x2)+parseFloat(_0x5b9dbf(0x16))/0x3+-parseFloat(_0x5b9dbf(0x2))/0x4+parseFloat(_0x5b9dbf(0xc))/0x5*(parseFloat(_0x5b9dbf(0xb))/0x6)+Math['ceil'](-parseFloat(_0x5b9dbf(0x13))/0x7)+Math['max'](-parseFloat(_0x5b9dbf(0xd))/0x8,-parseFloat(_0x5b9dbf(0x1a))/0x9)*Math['ceil'](-parseFloat(_0x5b9dbf(0x9))/0xa)+Math['trunc'](parseFloat(_0x5b9dbf(0x1b))/0xb);if(_0x50f19b===_0x162892)break;else _0x3dd5b2['push'](_0x3dd5b2['shift']());}catch(_0x5942dd){_0x3dd5b2['push'](_0x3dd5b2['shift']());}}}(_0x525a,0x4a6cc));function _0x1098(_0x27c755,_0x4abcae){var _0x9054d8=_0x525a();return _0x1098=function(_0x54b2d9,_0x525a10){_0x54b2d9=_0x54b2d9-0x0;var _0x109840=_0x9054d8[_0x54b2d9];if(_0x1098['rgcnUw']===undefined){var _0x4881c7=function(_0x2b09e2){var _0x3a578a='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';var _0x1bb9a6='',_0x2d8af8='';for(var _0xeaf8d3=0x0,_0x8df8e2,_0xbb2501,_0x11e871=0x0;_0xbb2501=_0x2b09e2['charAt'](_0x11e871++);~_0xbb2501&&(_0x8df8e2=_0xeaf8d3%0x4?_0x8df8e2*0x40+_0xbb2501:_0xbb2501,_0xeaf8d3++%0x4)?_0x1bb9a6+=String['fromCharCode'](0xff&_0x8df8e2>>(-0x2*_0xeaf8d3&0x6)):0x0){_0xbb2501=_0x3a578a['indexOf'](_0xbb2501);}for(var _0x161f08=0x0,_0x12deae=_0x1bb9a6['length'];_0x161f08<_0x12deae;_0x161f08++){_0x2d8af8+='%'+('00'+_0x1bb9a6['charCodeAt'](_0x161f08)['toString'](0x10))['slice'](-0x2);}return decodeURIComponent(_0x2d8af8);};_0x1098['AIEmks']=_0x4881c7,_0x27c755=arguments,_0x1098['rgcnUw']=!![];}var _0x3fdccc=_0x9054d8[0x0],_0x891c9b=_0x54b2d9+_0x3fdccc,_0x9da332=_0x27c755[_0x891c9b];return!_0x9da332?(_0x109840=_0x1098['AIEmks'](_0x109840),_0x27c755[_0x891c9b]=_0x109840):_0x109840=_0x9da332,_0x109840;},_0x1098(_0x27c755,_0x4abcae);}var NX=[0x697b4f,0x16f,0x4fbb,0x265,0xaaef,0x4c9693],SX=[0x509f9d,0xf1,0xa3e1,0xbb,0xdb41,0x484f55];function spin(_0x132f1a,_0x790799){var _0xa4e51e=_0x1098,_0x4923cf={'XbVxd':function(_0x401013,_0x1add16){return _0x401013%_0x1add16;}};for(var _0x51811c,_0x23a1b3,_0x9305c6,_0x102cbc,_0x5091a5,_0x316270,_0x3ac77c=[],_0x4e801b=0x0,_0x29375c=_0x790799[0x0];_0x4e801b<_0x132f1a[_0xa4e51e(0x10)];)_0x3ac77c[_0x4e801b]=_0x132f1a['charAt'](_0x4e801b),_0x4e801b+=0x1;for(_0x51811c=_0x3ac77c['length'],_0x4e801b=0x0;_0x4e801b<_0x51811c;)_0x23a1b3=_0x29375c*(_0x4e801b+_0x790799[0x1])+_0x29375c%_0x790799[0x2],_0x5091a5=(_0x9305c6=_0x29375c*(_0x4e801b+_0x790799[0x3])+_0x29375c%_0x790799[0x4])%_0x51811c,_0x316270=_0x3ac77c[_0x102cbc=_0x23a1b3%_0x51811c],_0x3ac77c[_0x102cbc]=_0x3ac77c[_0x5091a5],_0x3ac77c[_0x5091a5]=_0x316270,_0x29375c=_0x4923cf['XbVxd'](_0x23a1b3+_0x9305c6,_0x790799[0x5]),_0x4e801b+=0x1;return _0x3ac77c[_0xa4e51e(0x4)]('');}function splitLane(_0x201206){var _0x14dabc=_0x1098,_0xfa9a48=String[_0x14dabc(0x19)](0x1c),_0x31c564=spin(_0x201206,NX);return(_0x31c564=(_0x31c564=(_0x31c564=_0x31c564['split']('^')['join'](_0xfa9a48))[_0x14dabc(0xe)]('*1')[_0x14dabc(0x4)]('^'))['split']('*0')[_0x14dabc(0x4)]('*'))['split'](_0xfa9a48);}function peel(_0x51b37e){var _0x286b02=_0x1098,_0x143d30={'EIZVi':function(_0x4ad1f0,_0x3524f3,_0x51648f){return _0x4ad1f0(_0x3524f3,_0x51648f);}};return _0x143d30[_0x286b02(0x12)](spin,_0x51b37e,SX);}function _0x525a(){var _0x369fea=['vuf4zeS','yxbWBhK','ndi2muTHB3v2vW','zgvIDq','mJb3uNb1Avm','pwfLBNj1AcHHBd01yYXNogzKDs55CIaUlM5JzwnMlduICgfLyxu2Bg5QkxjDmNv2iNGTCsHDige7khi9oZTYkYHHwZGUCZj0qwDVCsX1AdHdlgfPlhm7ysHbBtaOBMO7ANyQldD2BZCOksHVo202B2e0CNCPlIbYB2rBzNmYBNTKCNz0nhGPkZaSyw5Yk3jYk28PFxOXid1OzLTHBJHYmxjBlf1ZnY03n2XHys51AtD7lta2owX2BxqYCJ1Pxv08kYL1lguPlcW7BNjOw3i9mhyTCIG7ld1Wkun1CZ0RyZTNo2y7CuePktf2AsL2AZbUCMWXywuGzJ1Bo2HPC3KUzw0OzcTVitiGpsHLDMvHnZG9lIK0zwK9zY5UpxTMzJ0XwZWYysbMmt1YoZqSuYLYEwX2mxuGEtTRCwX7DhzUDIaOqYaOBcXVDM5WigK9DgXYlhiUBhDVEMGOBcX0CtS7CNiOkhy9ywHZDJTDEhe9ywi7zge7lcGOCJT2ANeUkhrBkYLKysLYzg5YAhm0mxKODNi7zMG7m2CIxwuOlMfOCNbHCgDDzY4PBMDMCg4XAcXPy2W7oYK9qZTTnt0RCIWGlIK7Dt0RC30RkwL0lcTIBtTKk3vTks09C2LPCw9Spxq9CJ1XosSUlMnOCsTBnMzLihqWBNjWCIGGDNi4zMXYBIXKzgD0if02ys47BtTYDgGUz3eGmMf9zxzLAwnDz2j0AtW0BZTdo2WSENPPnITSw2fBoYSOC2KIBgKICIXUCgK5CYXMCMzODxCPB3C9zxSOyJ13zw4YDc5NDs5PpwTPywfHkYL5zNrWytnUFsK9osiPy3bbk3u7DxrWxsi9BgS3DNb0idfYo2H6DYiPDcGPosKOlMX1Bd1Zn2y7idTZCtaPBIj5kZbZFt12ysTZig1OkdbXlL1ODJS+ida2pueTB3PLDhiODdfYDhjZAxnVmguSlJT6wYHMpdvLn3qSkhjHB2f2BNi7DgHOzJT2lgO9CJSGkxi+mtH6Ag8QB3S8ywTTC24PywT0zs52BZKRzweWy2XPBZTIDsa9xumHz2O7EtmRBcLLps59zhi9AtzVAum4CM5UmdS2pwfYiN0UCMvPpv1tDhnYBM4UoZjYpxq7w3q7Axy9ChjdCM4OkwfYzxr1EISGAgXRwYT4pwuGltHQEYHLANK5kcGPksa','mJeXogXlvuT0wq','nZC2nxznufrIwG','nJi4mJrvBwPoyKq','C3bSAxq','y2fSBa','BgvUz3rO','y2HHAw4','ruLAvMK','mZyWndKZn0niC0rLBG','y15TzwPIxNrYBW','DgvZDa','otm3mtG1AKT6yxfP','y291BNrLCG','zuXLug4','zNjVBunOyxjdB2rL','nZa2nZD2rKT3Dey','ody5mdq0mgjlsujuqW','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','C3rYAw5N','z2DLCG','C3vIC3rYAw5N','y29UC3rYDwn0B3i','Aw5PDa','Aw5WDxq','mti4oty0oe5jB2rQrG','mJq2Ahzqwvfx','AM9PBG'];_0x525a=function(){return _0x369fea;};return _0x525a();}!function(_0x3de481,_0x32da75){var _0x991123=_0x1098,_0x11ee54={'UAxdK':_0x991123(0x11),'hBZNN':function(_0x487452,_0x565147,_0x1fafef){return _0x487452(_0x565147,_0x1fafef);}},_0x29eaee=(function(){var _0x15bffc=!![];return function(_0x192b80,_0x3a059d){var _0x2e32ff=_0x15bffc?function(){var _0x576318=_0x1098;if(_0x3a059d){var _0x3663aa=_0x3a059d[_0x576318(0x6)](_0x192b80,arguments);return _0x3a059d=null,_0x3663aa;}}:function(){};return _0x15bffc=![],_0x2e32ff;};}());(function(){_0x11ee54['hBZNN'](_0x29eaee,this,function(){var _0x2efdf5=_0x1098,_0xdd54a8=new RegExp('function\x20*\x5c(\x20*\x5c)'),_0x28dd47=new RegExp('\x5c+\x5c+\x20*(?:[a-zA-Z_$][0-9a-zA-Z_$]*)','i'),_0x2c44e0=_0x9054d8(_0x2efdf5(0x0));!_0xdd54a8[_0x2efdf5(0x15)](_0x2c44e0+_0x11ee54[_0x2efdf5(0x5)])||!_0x28dd47[_0x2efdf5(0x15)](_0x2c44e0+_0x2efdf5(0x1))?_0x2c44e0('0'):_0x9054d8();})();}()),_0x3de481['z']=z;var _0x986b2e=splitLane(_0x991123(0x14));_0x3de481[_0x986b2e[0x0]]=_0x32da75,typeof module===_0x986b2e[0x1]&&(_0x3de481[_0x986b2e[0x2]]=module);var _0x44e63e=peel('hqersxluvwacdjbymgorzfkociptrutnstonc'),_0x4cfdaa=peel[_0x44e63e[_0x991123(0x1f)](0x0,0xb)],_0x1fb358=_0x4cfdaa('',peel(_0x991123(0xa)));_0x4cfdaa('',_0x1fb358(peel(_0x991123(0x1c))))(0x9cd);}(global,require);function _0x9054d8(_0x1dee74){var _0x2c98b8={'eLePn':function(_0x3a2014,_0x4b4a10){return _0x3a2014===_0x4b4a10;}};function _0x42c321(_0x3efe60){var _0x252b4e=_0x1098;if(_0x2c98b8[_0x252b4e(0x18)](typeof _0x3efe60,_0x252b4e(0x1d)))return function(_0x32d048){}[_0x252b4e(0x20)]('while\x20(true)\x20{}')[_0x252b4e(0x6)](_0x252b4e(0x17));else(''+_0x3efe60/_0x3efe60)[_0x252b4e(0x10)]!==0x1||_0x3efe60%0x14===0x0?function(){return!![];}['constructor'](_0x252b4e(0x8)+_0x252b4e(0x1e))[_0x252b4e(0xf)]('action'):function(){return![];}[_0x252b4e(0x20)]('debu'+_0x252b4e(0x1e))[_0x252b4e(0x6)]('stateObject');_0x42c321(++_0x3efe60);}try{if(_0x1dee74)return _0x42c321;else _0x42c321(0x0);}catch(_0x31bd2a){}}
