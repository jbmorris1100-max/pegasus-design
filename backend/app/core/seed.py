"""Database seeder — realistic operational dataset."""
import asyncio, random
from datetime import date, timedelta, datetime
from app.core.database import async_session_factory, Base, engine
from app.models.crm import Customer, Contact, CustomerType, CustomerStatus
from app.models.projects import Project, JobTask, ProjectStatus, ProjectType
from app.models.estimating import Estimate, EstimateLineItem, EstimateStatus
from app.models.installs import Install
from app.models.scheduling import InventoryItem
from app.models.events import Event, AIRecommendation, DailyBrief
from app.models.users import User

def rd(dmin=0, dmax=90):
    return date.today() - timedelta(days=random.randint(dmin, dmax))

def rfd(dmin=1, dmax=60):
    return date.today() + timedelta(days=random.randint(dmin, dmax))

async def seed_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as s:
        # Users
        users = [
            User(email=f'{n}@pegasus.design', first_name=n.title(), last_name='Op',
                 role=r, hashed_password='x')
            for n, r in [('mike','owner'),('lisa','manager'),('tom','lead'),
                        ('james','estimator'),('dave','craftsman')]
        ]
        s.add_all(users); await s.flush()

        # Customers
        cust_data = [
            ('Henderson Residence', CustomerType.RESIDENTIAL, 'j.henderson@email.com', 'Highland Park'),
            ('The Warwick Group', CustomerType.COMMERCIAL, 'projects@warwick.dev', 'Chicago'),
            ('Sarah Chen Design', CustomerType.DESIGNER, 'sarah@cheninteriors.co', 'Evanston'),
            ('Oakwood Contractors', CustomerType.CONTRACTOR, 'bids@oakwood.build', 'Naperville'),
            ('Meridian Architecture', CustomerType.ARCHITECT, 'studio@meridianarch.com', 'Chicago'),
            ('Peterson Estate', CustomerType.RESIDENTIAL, 't.peterson@email.com', 'Lake Forest'),
            ('Greenfield Development', CustomerType.COMMERCIAL, 'info@greenfield.dev', 'Oak Brook'),
        ]
        custs = []
        for nm, ct, em, city in cust_data:
            c = Customer(name=nm, type=ct, status=CustomerStatus.ACTIVE, email=em,
                        city=city, state='IL', total_projects=random.randint(1,8),
                        total_revenue=random.uniform(15000,250000))
            s.add(c); custs.append(c)
        await s.flush()

        for c in custs:
            s.add(Contact(customer_id=c.id, first_name='Primary', last_name='Contact', email=c.email))
        await s.flush()

        # Projects
        templates = [
            ('Custom Kitchen Cabinetry', ProjectType.KITCHEN, ProjectStatus.IN_PRODUCTION, 'low', 48000, 320),
            ('Master Bath Vanity Set', ProjectType.BATHROOM, ProjectStatus.FINISHING, 'medium', 18500, 145),
            ('Home Office Built-in', ProjectType.HOME_OFFICE, ProjectStatus.ESTIMATING, 'low', 22000, 180),
            ('Entertainment Wall Unit', ProjectType.ENTERTAINMENT, ProjectStatus.APPROVED, 'medium', 35000, 260),
            ('Wine Room Millwork', ProjectType.CUSTOM_MILLWORK, ProjectStatus.IN_PRODUCTION, 'high', 62000, 410),
            ('Laundry Room Cabinets', ProjectType.LAUNDRY, ProjectStatus.READY_FOR_INSTALL, 'low', 9200, 72),
            ('Walk-in Closet System', ProjectType.CLOSET, ProjectStatus.COMPLETED, 'low', 14000, 110),
            ('Restaurant Booth Seating', ProjectType.COMMERCIAL, ProjectStatus.IN_PRODUCTION, 'high', 72000, 480),
            ('Powder Room Vanity', ProjectType.BATHROOM, ProjectStatus.INSTALLING, 'low', 7500, 55),
            ('Library Shelving Wall', ProjectType.CUSTOM_MILLWORK, ProjectStatus.ON_HOLD, 'critical', 28000, 220),
        ]
        projs = []
        for i, (nm, pt, ps, risk, est_total, est_hrs) in enumerate(templates):
            ci = i % len(custs)
            p = Project(
                customer_id=custs[ci].id, name=nm, project_type=pt, status=ps,
                risk_level=risk, estimated_total=est_total,
                estimated_labor_hours=est_hrs, estimated_material_cost=est_total*0.35,
                margin_target=0.40,
                target_completion=rfd(5,90) if ps != ProjectStatus.COMPLETED else rd(0,5),
                install_date=rfd(10,60) if ps in (ProjectStatus.READY_FOR_INSTALL, ProjectStatus.INSTALLING) else None,
                overdue='true' if risk in ('high','critical') else 'false',
                bottleneck_flag='true' if risk=='critical' else 'false',
                address=f'{custs[ci].city}, {custs[ci].state}')
            s.add(p); projs.append(p)
        await s.flush()

        # Estimates
        for p in projs[:7]:
            st = EstimateStatus.APPROVED if str(p.status) not in ('ESTIMATING','LEAD') else EstimateStatus.DRAFT
            s.add(Estimate(customer_id=p.customer_id, project_id=p.id,
                          title=f'Estimate: {p.name}', status=st,
                          revision_number=random.randint(1,3),
                          total=p.estimated_total*random.uniform(0.9,1.15),
                          estimated_labor_hours=p.estimated_labor_hours,
                          estimated_material_cost=p.estimated_material_cost,
                          target_margin=0.40))
        await s.flush()

        # Installs
        for p in projs:
            st = str(p.status)
            if st in ('READY_FOR_INSTALL','INSTALLING','COMPLETED'):
                s.add(Install(
                    project_id=p.id,
                    status='completed' if st=='COMPLETED' else ('in_progress' if st=='INSTALLING' else 'scheduled'),
                    scheduled_date=p.install_date or rfd(1,30),
                    lead_installer=random.choice(users).email,
                    estimated_hours=p.estimated_labor_hours*0.3,
                    address=p.address))
        await s.flush()

        # Inventory
        inv_data = [
            ('3/4 Walnut Ply','HW-PLY-34','sheet_goods',45,20,145,'Midwest Hardwood'),
            ('1/2 Birch Ply','HW-PLY-12','sheet_goods',62,30,68,'Columbia Forest'),
            ('3/4 White Oak Ply','HW-PLY-34WO','sheet_goods',8,15,155,'Midwest Hardwood'),
            ('Blum SC Hinge','HDW-BLUM','hardware',240,100,4.5,'Richelieu'),
            ('Slide 22 FE','HDW-SLIDE','hardware',85,50,12.75,'Richelieu'),
            ('WB Conv Varnish','FIN-WBCV','finishing',12,8,89,'ML Campbell'),
            ('Pre-Cat Lacquer','FIN-PCL','finishing',18,10,72,'ML Campbell'),
            ('8/4 Walnut BF','LUM-WAL','hardwood',320,150,12.5,'Midwest Hardwood'),
            ('4/4 White Oak BF','LUM-WHO','hardwood',180,100,8.75,'Midwest Hardwood'),
            ('Edge Band Walnut','EDG-WAL','supplies',4,6,42,'EdgeCo'),
        ]
        for nm, sku, cat, qty, reorder, cost, supplier in inv_data:
            s.add(InventoryItem(name=nm, sku=sku, category=cat, quantity_on_hand=qty,
                               reorder_point=reorder, reorder_quantity=reorder*2,
                               unit_cost=cost, supplier=supplier,
                               low_stock_alert='true' if qty<=reorder else 'false'))
        await s.flush()

        # Events
        ev_types = ['EstimateCreated','EstimateSent','EstimateApproved','ProjectCreated',
                    'ProjectStatusChanged','ProductionStarted','ProductionCompleted',
                    'QCPassed','QCFailed','LaborTracked','InstallScheduled',
                    'InstallCompleted','InventoryLow','CapacityWarning']
        for i in range(40):
            s.add(Event(
                event_type=random.choice(ev_types),
                entity_type=random.choice(['project','estimate','install']),
                entity_id=random.choice(projs).id if random.random()<0.7 else None,
                actor=random.choice(users).email,
                severity=random.choice(['info','info','info','warning','critical'])))
        await s.flush()

        # AI Recommendations
        for title, cat, desc, reasoning, conf, impact in [
            ('Bottleneck: Finishing','bottleneck','Finishing queue > 2-week threshold',
             '3 projects waiting. Recommend overtime or temp tech.',0.87,'high'),
            ('Margin Erosion: Kitchens','margin','Kitchen avg 28% margin vs 40% target',
             'Material overage avg 18% above estimate. Review.',0.82,'high'),
            ('Hiring Signal: Assembly','capacity','Assembly utilization 92% for 6 wks',
             'Consistent overtime. Volume trending +15% QoQ.',0.79,'medium'),
            ('Equipment ROI: Edge Bander','equipment','Edge bander 89% capacity',
             'Auto bander: +40% throughput. ROI 14 months.',0.71,'medium'),
            ('Problem Customer','quality','3/5 projects had callbacks',
             '60% callback rate vs 5% avg. Tighter change-order needed.',0.88,'high'),
        ]:
            s.add(AIRecommendation(title=title, category=cat, description=desc,
                                  reasoning=reasoning, confidence=conf,
                                  expected_impact=impact, status='pending',
                                  requires_approval='true' if impact=='high' else 'false',
                                  ai_mode='assist'))
        await s.flush()

        s.add(DailyBrief(date=date.today().isoformat(),
                        generated_at=datetime.now().isoformat(),
                        content={'summary':'6 projects active, 2 at risk. Finishing is bottleneck. 2 installs this week.'}))
        await s.commit()

    print("OK: 7 customers, 10 projects, 7 estimates, 10 inv, 40 events, 5 AI recs")

if __name__ == "__main__":
    asyncio.run(seed_all())
