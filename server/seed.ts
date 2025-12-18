import { storage } from './storage';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await storage.createUser({
      username: 'admin',
      password: adminPassword,
      name: 'Sistem Yöneticisi',
      role: 'admin',
    });
    console.log('✅ Created admin user');

    // Create regular users
    const userPassword = await bcrypt.hash('user123', 10);
    const itManager = await storage.createUser({
      username: 'it_manager',
      password: userPassword,
      name: 'Ahmet Yılmaz',
      role: 'user',
    });

    const ikManager = await storage.createUser({
      username: 'ik_manager',
      password: userPassword,
      name: 'Ayşe Demir',
      role: 'user',
    });
    console.log('✅ Created regular users');

    // Create departments
    const itDept = await storage.createDepartment({ name: 'Bilgi Teknolojileri (IT)' });
    const ikDept = await storage.createDepartment({ name: 'İnsan Kaynakları' });
    console.log('✅ Created departments');

    // Create cost groups
    const personnelGroup = await storage.createCostGroup({ 
      name: 'Personel Giderleri', 
      departmentId: itDept.id 
    });
    const infrastructureGroup = await storage.createCostGroup({ 
      name: 'Altyapı ve Lisanslar', 
      departmentId: itDept.id 
    });
    const trainingGroup = await storage.createCostGroup({ 
      name: 'Eğitim Giderleri', 
      departmentId: ikDept.id 
    });
    console.log('✅ Created cost groups');

    // Create budget items
    await storage.createBudgetItem({
      name: 'Yazılım Ekibi Maaşları',
      type: 'cost',
      costGroupId: personnelGroup.id,
      monthlyValues: { 
        0: 50000, 1: 50500, 2: 51000, 3: 50200, 4: 50800, 5: 51500, 
        6: 50300, 7: 50700, 8: 51200, 9: 50400, 10: 50900, 11: 51600 
      },
      status: 'approved',
      year: 2025,
    });

    await storage.createBudgetItem({
      name: 'Dış Kaynak Kullanımı',
      type: 'cost',
      costGroupId: personnelGroup.id,
      monthlyValues: { 
        0: 15000, 1: 12000, 2: 18000, 3: 16000, 4: 14000, 5: 17000, 
        6: 15500, 7: 13000, 8: 19000, 9: 16500, 10: 14500, 11: 17500 
      },
      status: 'draft',
      year: 2025,
    });

    await storage.createBudgetItem({
      name: 'AWS Sunucu Giderleri',
      type: 'cost',
      costGroupId: infrastructureGroup.id,
      monthlyValues: { 
        0: 8000, 1: 8200, 2: 8100, 3: 8300, 4: 8150, 5: 8250, 
        6: 8180, 7: 8220, 8: 8280, 9: 8190, 10: 8240, 11: 8300 
      },
      status: 'approved',
      currentRevision: 1,
      year: 2025,
    });

    await storage.createBudgetItem({
      name: 'Liderlik Eğitimi',
      type: 'cost',
      costGroupId: trainingGroup.id,
      monthlyValues: { 
        0: 5000, 1: 0, 2: 5000, 3: 0, 4: 5000, 5: 0, 
        6: 5000, 7: 0, 8: 5000, 9: 0, 10: 5000, 11: 0 
      },
      status: 'pending',
      year: 2025,
    });
    console.log('✅ Created budget items');

    // Create project
    const ecommerceProject = await storage.createProject({ name: 'Yeni E-Ticaret Platformu' });
    console.log('✅ Created project');

    // Create project phase
    const mvpPhase = await storage.createProjectPhase({ 
      name: 'Faz 1: MVP Geliştirme', 
      projectId: ecommerceProject.id 
    });
    console.log('✅ Created project phase');

    // Create project budget items
    await storage.createBudgetItem({
      name: 'UX/UI Tasarım Ajansı',
      type: 'cost',
      projectPhaseId: mvpPhase.id,
      monthlyValues: { 
        0: 12000, 1: 12000, 2: 12000, 3: 12000, 4: 0, 5: 0, 
        6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 
      },
      status: 'approved',
      year: 2025,
    });

    await storage.createBudgetItem({
      name: 'Erken Erişim Satışları',
      type: 'revenue',
      projectPhaseId: mvpPhase.id,
      monthlyValues: { 
        0: 0, 1: 0, 2: 0, 3: 5000, 4: 8000, 5: 12000, 
        6: 15000, 7: 18000, 8: 22000, 9: 25000, 10: 28000, 11: 30000 
      },
      status: 'draft',
      year: 2025,
    });
    console.log('✅ Created project budget items');

    // Assign users to departments and projects
    await storage.assignUserToDepartment(admin.id, itDept.id);
    await storage.assignUserToDepartment(admin.id, ikDept.id);
    await storage.assignUserToProject(admin.id, ecommerceProject.id);

    await storage.assignUserToDepartment(itManager.id, itDept.id);
    await storage.assignUserToProject(itManager.id, ecommerceProject.id);

    await storage.assignUserToDepartment(ikManager.id, ikDept.id);
    console.log('✅ Created user assignments');

    console.log('\n✨ Seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   IT Manager: username=it_manager, password=user123');
    console.log('   IK Manager: username=ik_manager, password=user123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
