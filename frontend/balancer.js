const CATALOG_SERVERS = [
    'http://catalog1:3000',
    'http://catalog2:3000'
];

const ORDER_SERVERS = [
    'http://order1:3001',
    'http://order2:3001'
];

let catalogIndex = 0;
let orderIndex = 0;

function getCatalogServer() {
    const server = CATALOG_SERVERS[catalogIndex];
    catalogIndex = (catalogIndex + 1) % CATALOG_SERVERS.length;
    return server;
}

function getOrderServer() {
    const server = ORDER_SERVERS[orderIndex];
    orderIndex = (orderIndex + 1) % ORDER_SERVERS.length;
    return server;
}

module.exports = {
    getCatalogServer,
    getOrderServer
};