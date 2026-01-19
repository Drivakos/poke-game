const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'Pokehelper';

async function analyze() {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    const moves = await db.collection('moves').find({}).toArray();

    console.log(`Analyzing ${moves.length} moves...`);

    const categories = {
        recoil: [],
        drain: [],
        multiHit: [],
        selfDestruct: [],
        highCrit: [],
        ohko: [],
        charge: [],
        recharge: [],
        fixedDamage: [],
        flinch: [],
        alwaysHit: [],
        priority: [],
        userStatDrop: [],
        protect: []
    };

    moves.forEach(m => {
        const desc = (m.desc || m.shortDesc || '').toLowerCase();
        const name = m.name;

        if (desc.includes('recoil') || desc.includes('damage the user')) categories.recoil.push(name);
        if ((desc.includes('recover') && desc.includes('damage dealt')) || desc.includes('drains')) categories.drain.push(name);
        if (desc.includes('hits 2-5 times') || desc.includes('hits twice') || desc.includes('hits two times')) categories.multiHit.push(name);
        if (desc.includes('faints') && desc.includes('user')) categories.selfDestruct.push(name);
        if (desc.includes('critical hit ratio')) categories.highCrit.push(name);
        if (desc.includes('one-hit ko') || desc.includes('ohko')) categories.ohko.push(name);
        if (desc.includes('charges') || desc.includes('turn 1')) categories.charge.push(name);
        if (desc.includes('must recharge')) categories.recharge.push(name);
        if (desc.includes('damage equals') || desc.includes('set damage') || desc.includes('level')) categories.fixedDamage.push(name);
        if (desc.includes('flinch')) categories.flinch.push(name);
        if (desc.includes('never miss') || desc.includes('do not check accuracy')) categories.alwaysHit.push(name);
        if (m.priority && m.priority > 0) categories.priority.push(name);
        if (desc.includes('lowers the user') || desc.includes('lowers user')) categories.userStatDrop.push(name);
        if (name === 'Protect' || name === 'Detect') categories.protect.push(name);
    });

    console.log('--- Analysis Report ---');
    console.log('Recoil (Sample):', categories.recoil.slice(0, 10).join(', '));
    console.log('Flinch (Sample):', categories.flinch.slice(0, 10).join(', '));
    console.log('Always Hit:', categories.alwaysHit.slice(0, 10).join(', '));
    console.log('Priority (Sample):', categories.priority.slice(0, 10).join(', '));
    console.log('User Stat Drop (Sample):', categories.userStatDrop.slice(0, 10).join(', '));
    console.log('Recharge:', categories.recharge.join(', '));
    console.log('Fixed Damage:', categories.fixedDamage.slice(0, 10).join(', '));
    console.log('OHKO:', categories.ohko.join(', '));
    console.log('Charge:', categories.charge.slice(0, 10).join(', '));

    await client.close();
}

analyze().catch(console.error);
