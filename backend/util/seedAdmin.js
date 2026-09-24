import User from "../models/users.js";

import { log } from "./logger.js";

async function seedAdminUser() {
    try {
        const existingAdminUser = await User.countDocuments();
        if (existingAdminUser > 0) {
            console.log('Admin user already exists');
            log(`Admin user already exists`);
            return;
        }
        const adminUser = new User({
            name: 'Sridhar',
            email: "jayamproj@gmail.com",
            role: 'admin',
            status: 'active',
            permission: {
                    dashboard: true,
    roomsBooking: true,
    foodManagement: true,
    reports: true,
    customer: false,
    settings: false,
    users: false,
            }
        });

        await adminUser.save();
        console.log('Admin user seeded successfully');
        log(`Admin user seeded successfully Name : ${adminUser.name}, Email : ${adminUser.email}`);
    } catch (error) {
        console.error('Error seeding admin user:', error);
        log(`Error seeding admin user: ${error}`);
    }
}


export { seedAdminUser };