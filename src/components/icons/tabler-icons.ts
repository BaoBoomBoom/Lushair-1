/** Tabler-style stroke icons — aligned with lushair_app.html (ti ti-*) */

export type TablerIconName =
    | 'sparkles'
    | 'pill'
    | 'droplet'
    | 'fish'
    | 'bath'
    | 'yoga'
    | 'check'
    | 'x'
    | 'arrow-right'
    | 'chevron-right'
    | 'chevron-down'
    | 'chevron-up'
    | 'plus'
    | 'flame'
    | 'camera'
    | 'scan'
    | 'play'
    | 'device-mobile'
    | 'heart'
    | 'thumb-up'
    | 'award'
    | 'chart-bar'
    | 'circle-dotted'
    | 'qrcode'
    | 'clock'
    | 'eye'
    | 'package'
    | 'circle'
    | 'alert-triangle'
    | 'flask'
    | 'egg'
    | 'wave-sine'
    | 'color-filter'
    | 'snowflake'
    | 'lock'
    | 'search'
    | 'user-scan'
    | 'user'
    | 'user-circle'
    | 'calendar'
    | 'battery-2'
    | 'timeline-event'
    | 'layout-grid'
    | 'arrows-horizontal'
    | 'trending-up'
    | 'message-circle'
    | 'caret-down'
    | 'bell'
    | 'palette'
    | 'link'
    | 'help'
    | 'world'
    | 'database'
    | 'mail'
    | 'phone'
    | 'trash';

export interface TablerIconDef {
    viewBox?: string;
    paths: string[];
    fill?: boolean;
}

export const TABLER_ICONS: Record<TablerIconName, TablerIconDef> = {
    check: {
        paths: ['M5 12l5 5L20 7'],
    },
    x: {
        paths: ['M6 6l12 12', 'M18 6L6 18'],
    },
    'arrow-right': {
        paths: ['M5 12h14', 'M13 6l6 6-6 6'],
    },
    'chevron-right': {
        paths: ['M9 6l6 6-6 6'],
    },
    'chevron-down': {
        paths: ['M6 9l6 6 6-6'],
    },
    'chevron-up': {
        paths: ['M6 15l6-6 6 6'],
    },
    plus: {
        paths: ['M12 5v14', 'M5 12h14'],
    },
    sparkles: {
        paths: [
            'M9.5 8.5l1-3.5 1 3.5 3.5 1-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1z',
            'M17 14l.5-1.5.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z',
        ],
    },
    pill: {
        paths: ['M8 8h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8z'],
    },
    droplet: {
        paths: ['M12 3c3 4 6 6.5 6 10a6 6 0 1 1-12 0c0-3.5 3-6 6-10z'],
    },
    fish: {
        paths: [
            'M4 12c2-4 6-6 10-4 2 1 3 2 4 4-1 2-2 3-4 4-4 2-8 0-10-4z',
            'M14 10l3-2',
            'M6 11l-2-1',
        ],
    },
    bath: {
        paths: [
            'M4 14h16',
            'M6 14v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3',
            'M8 6a2 2 0 0 1 4 0',
        ],
    },
    yoga: {
        paths: [
            'M12 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
            'M8 21l4-7 4 7',
            'M6 14h12',
        ],
    },
    flame: {
        paths: ['M12 3c2 4 5 5.5 5 9a5 5 0 1 1-10 0c0-2 1.5-3.5 3-5 1 2 2 3 2 5z'],
    },
    camera: {
        paths: [
            'M8 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2',
            'M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
            'M9 7l1.5-2h3L15 7',
        ],
    },
    scan: {
        paths: [
            'M8 7H6v2',
            'M16 7h2v2',
            'M8 17H6v-2',
            'M16 17h2v-2',
            'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
        ],
    },
    play: {
        paths: ['M8 5v14l11-7z'],
        fill: true,
    },
    'device-mobile': {
        paths: [
            'M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
            'M11 17h2',
        ],
    },
    heart: {
        paths: ['M12 20l-1.5-1.35C6.5 14.5 4 12.2 4 9.5A3.5 3.5 0 0 1 7.5 6 4 4 0 0 1 12 8.1 4 4 0 0 1 16.5 6 3.5 3.5 0 0 1 20 9.5c0 2.7-2.5 5-6.5 9.15L12 20z'],
    },
    'thumb-up': {
        paths: [
            'M7 11v8a1 1 0 0 0 1 1h2',
            'M7 11l2-6a2 2 0 0 1 2-1h1a2 2 0 0 1 2 2v5h4a2 2 0 0 1 2 2l-1 5a2 2 0 0 1-2 2H7',
        ],
    },
    award: {
        paths: [
            'M8 4h8l1 4-5 3-5-3z',
            'M12 11v9',
            'M8 20h8',
        ],
    },
    'chart-bar': {
        paths: ['M5 20V10', 'M10 20V4', 'M15 20v-6', 'M20 20V14'],
    },
    'circle-dotted': {
        paths: ['M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M12 8v0', 'M8 12v0', 'M16 12v0', 'M12 16v0'],
    },
    qrcode: {
        paths: [
            'M4 4h6v6H4z',
            'M14 4h6v6h-6z',
            'M4 14h6v6H4z',
            'M14 14h2v2h-2z',
            'M18 14h2v2h-2z',
            'M14 18h2v2h-2z',
            'M18 18h2v2h-2z',
        ],
    },
    clock: {
        paths: ['M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0', 'M12 8v4l3 2'],
    },
    eye: {
        paths: [
            'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
            'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z',
        ],
    },
    package: {
        paths: [
            'M4 8l8-4 8 4v8l-8 4-8-4z',
            'M4 8l8 4 8-4',
            'M12 12v8',
        ],
    },
    circle: {
        paths: ['M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0'],
    },
    'alert-triangle': {
        paths: ['M12 4l9 16H3z', 'M12 10v4', 'M12 18h.01'],
    },
    flask: {
        paths: [
            'M9 3h6',
            'M10 3v4l-4 9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l-4-9V3',
        ],
    },
    egg: {
        paths: ['M12 4c3 2 5 5 5 8a5 5 0 1 1-10 0c0-3 2-6 5-8z'],
    },
    'wave-sine': {
        paths: ['M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0'],
    },
    'color-filter': {
        paths: [
            'M12 3l7 7-7 11-7-11z',
            'M8 10h8',
        ],
    },
    snowflake: {
        paths: [
            'M12 3v18',
            'M3 12h18',
            'M5.5 5.5l13 13',
            'M18.5 5.5l-13 13',
        ],
    },
    lock: {
        paths: [
            'M8 11V8a4 4 0 1 1 8 0v3',
            'M6 11h12v9H6z',
        ],
    },
    search: {
        paths: [
            'M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
            'M16 16l4 4',
        ],
    },
    'user-scan': {
        paths: [
            'M8 8a4 4 0 1 0 8 0',
            'M6 20v-1a6 6 0 0 1 12 0v1',
            'M16 11h6',
            'M19 8v6',
        ],
    },
    user: {
        paths: [
            'M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
            'M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2',
        ],
    },
    'user-circle': {
        paths: [
            'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
            'M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
            'M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855',
        ],
    },
    calendar: {
        paths: [
            'M8 4v2',
            'M16 4v2',
            'M5 8h14',
            'M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
        ],
    },
    'battery-2': {
        paths: [
            'M6 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
            'M19 10v4',
            'M8 12h6',
        ],
    },
    'timeline-event': {
        paths: [
            'M12 8v8',
            'M8 12h8',
            'M4 6h16',
            'M6 6v3',
            'M18 6v3',
            'M6 9h12v11H6z',
        ],
    },
    'layout-grid': {
        paths: [
            'M5 5h5v5H5z',
            'M14 5h5v5h-5z',
            'M5 14h5v5H5z',
            'M14 14h5v5h-5z',
        ],
    },
    'arrows-horizontal': {
        paths: ['M8 8l-4 4 4 4', 'M16 8l4 4-4 4', 'M4 12h16'],
    },
    'trending-up': {
        paths: ['M16 7l-5 5-3-3-5 5', 'M16 7h-5v5'],
    },
    'message-circle': {
        paths: ['M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01'],
    },
    'caret-down': {
        paths: ['M6 10l6 6 6-6'],
        fill: true,
    },
    bell: {
        paths: [
            'M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 12v1a2 2 0 0 0 2 2h-12a2 2 0 0 0 2 -2v-1a7 7 0 0 1 4 -12',
            'M9 17v1a3 3 0 0 0 6 0v-1',
        ],
    },
    palette: {
        paths: [
            'M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25',
            'M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
            'M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
            'M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
        ],
    },
    link: {
        paths: [
            'M9 15l6 -6',
            'M11 6l.463 -.002a5 5 0 0 1 3.584 1.48l.567 .586a5 5 0 0 1 0 7.072l-.53 .53',
            'M13 18l-.397 .002a5 5 0 0 1 -3.584 -1.48l-.567 -.586a5 5 0 0 1 0 -7.072l.53 -.53',
        ],
    },
    help: {
        paths: [
            'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
            'M12 17v.01',
            'M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4',
        ],
    },
    world: {
        paths: [
            'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
            'M3.6 9h16.8',
            'M3.6 15h16.8',
            'M12 3c1.5 3 2.5 5.5 2.5 9s-1 6 -2.5 9',
            'M12 3c-1.5 3 -2.5 5.5 -2.5 9s1 6 2.5 9',
        ],
    },
    database: {
        paths: [
            'M12 6m-8 0a8 3 0 1 0 16 0a8 3 0 1 0 -16 0',
            'M4 6v6a8 3 0 0 0 16 0v-6',
            'M4 12v6a8 3 0 0 0 16 0v-6',
        ],
    },
    mail: {
        paths: [
            'M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z',
            'M3 7l9 6l9 -6',
        ],
    },
    phone: {
        paths: [
            'M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2',
        ],
    },
    trash: {
        paths: [
            'M4 7l16 0',
            'M10 11l0 6',
            'M14 11l0 6',
            'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12',
            'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3',
        ],
    },
};
