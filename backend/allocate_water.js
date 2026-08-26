const { db } = require('./src/config/database');
const WaterReservoir = require('./src/models/WaterReservoir');
const Substation = require('./src/models/Substation');

async function allocateInitialWater() {
    try {
        console.log('💧 Allocating initial water to substations...');

        // Reset everything first
        await db.query('UPDATE water_reservoir SET capacity_liters = 600000, remaining_liters = 600000, total_drawn = 0 WHERE id = 1');
        await db.query('UPDATE substations SET allocated_water = 0, remaining_water = 0, total_drawn = 0, tap_a_drawn = 0, tap_b_drawn = 0');
        await db.query('DELETE FROM tap_usage');
        await db.query('DELETE FROM allocation_logs');

        console.log('✅ Reset all water data');

        // Define allocations for each substation
        const allocations = [
            { id: 1, amount: 20000 },  // Maji 1
            { id: 2, amount: 15000 },  // Maji 2
            { id: 3, amount: 18000 },  // Maji 3
            { id: 4, amount: 12000 },  // Maji 4
            { id: 5, amount: 20000 },  // Maji 5
            { id: 6, amount: 15000 }   // Maji 6
        ];

        let totalAllocated = 0;

        for (const alloc of allocations) {
            const substation = await Substation.findById(alloc.id);
            await Substation.allocateWater(alloc.id, alloc.amount);
            await WaterReservoir.updateRemaining(alloc.amount);
            
            await db.query(
                'INSERT INTO allocation_logs (substation_id, allocated_amount, allocated_by) VALUES (?, ?, ?)',
                [alloc.id, alloc.amount, 'system']
            );
            
            console.log(`✅ Allocated ${alloc.amount} L to ${substation.name}`);
            totalAllocated += alloc.amount;
        }

        console.log(`\n📊 Total Allocated: ${totalAllocated} L`);

        // Show updated status
        const updatedReservoir = await WaterReservoir.getStats();
        const allSubstations = await Substation.findAll();

        console.log(`\n📊 Reservoir: ${updatedReservoir.remaining_liters} L remaining`);
        console.log('\n📊 Substations:');
        allSubstations.forEach(s => {
            console.log(`    ${s.name}: ${s.remaining_water} L available`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error allocating water:', error);
        process.exit(1);
    }
}

allocateInitialWater();