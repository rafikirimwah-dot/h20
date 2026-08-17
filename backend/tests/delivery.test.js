const request = require('supertest');
const app = require('../src/app');
const { closePool } = require('../src/config/database');

let adminToken;
let subToken;
let orderId;

describe('Delivery API flow', () => {
    jest.setTimeout(20000);

    test('Create public delivery order', async () => {
        const res = await request(app)
            .post('/api/delivery')
            .send({
                customer_name: 'Test CI',
                customer_phone: '+1000000000',
                delivery_address: '123 CI St',
                liters_requested: 10,
                delivery_date: '2026-08-20',
                delivery_time: '09:00:00'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        orderId = res.body.data.id;
    });

    test('Admin login and assign order', async () => {
        const r = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'admin123' })
            .expect(200);
        adminToken = r.body.data.token;
        expect(adminToken).toBeTruthy();

        const assign = await request(app)
            .post(`/api/delivery/${orderId}/assign`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ substation_id: 1 })
            .expect(200);
        expect(assign.body.success).toBe(true);
        expect(assign.body.data.status).toBe('assigned');
    });

    test('Substation login and mark delivered', async () => {
        const r = await request(app)
            .post('/api/auth/login')
            .send({ username: 'maji1', password: 'maji123' })
            .expect(200);
        subToken = r.body.data.token;
        expect(subToken).toBeTruthy();

        const delivered = await request(app)
            .post(`/api/delivery/${orderId}/deliver`)
            .set('Authorization', `Bearer ${subToken}`)
            .send({})
            .expect(200);
        expect(delivered.body.success).toBe(true);
        expect(delivered.body.data.status).toBe('delivered');
    });
    
    afterAll(async () => {
        // close DB pool
        await closePool();
    }, 10000);
});
