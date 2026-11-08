const seed = {
  students: [
    { id: 's-001', name: 'Achieng Mary', regNo: 'AZU/2025/001', department: 'Computer Science', year: 'Year 2', phone: '+256 701 245 810' },
    { id: 's-002', name: 'Okello Peter', regNo: 'AZU/2025/002', department: 'Business Administration', year: 'Year 3', phone: '+256 772 310 492' },
    { id: 's-003', name: 'Nyang’ Thon', regNo: 'AZU/2025/003', department: 'Education', year: 'Year 1', phone: '+256 758 923 104' },
    { id: 's-004', name: 'Wekesa Lucy', regNo: 'AZU/2025/004', department: 'Nursing', year: 'Year 2', phone: '+256 704 659 221' },
    { id: 's-005', name: 'Namara Brian', regNo: 'AZU/2025/005', department: 'Public Health', year: 'Year 4', phone: '+256 782 116 340' },
  ],
  hostels: [
    { id: 'h-001', name: 'Male Hostel', location: 'Block A', totalRooms: 120, warden: 'Daniel Kato' },
    { id: 'h-002', name: 'Female Hostel', location: 'Block B', totalRooms: 100, warden: 'Grace Atim' },
    { id: 'h-003', name: 'Graduate Hostel', location: 'Block C', totalRooms: 80, warden: 'Joseph Okot' },
    { id: 'h-004', name: 'International Hostel', location: 'Block D', totalRooms: 70, warden: 'Sarah Nambi' },
  ],
  rooms: [
    { id: 'r-001', hostel: 'Male Hostel', roomNo: 'A101', capacity: 2, occupied: 2, status: 'Occupied' },
    { id: 'r-002', hostel: 'Male Hostel', roomNo: 'A102', capacity: 2, occupied: 1, status: 'Partially occupied' },
    { id: 'r-003', hostel: 'Male Hostel', roomNo: 'A103', capacity: 2, occupied: 0, status: 'Available' },
    { id: 'r-004', hostel: 'Female Hostel', roomNo: 'B101', capacity: 2, occupied: 2, status: 'Occupied' },
    { id: 'r-005', hostel: 'Female Hostel', roomNo: 'B102', capacity: 2, occupied: 0, status: 'Available' },
    { id: 'r-006', hostel: 'Graduate Hostel', roomNo: 'C201', capacity: 1, occupied: 1, status: 'Occupied' },
    { id: 'r-007', hostel: 'Graduate Hostel', roomNo: 'C202', capacity: 1, occupied: 0, status: 'Available' },
    { id: 'r-008', hostel: 'International Hostel', roomNo: 'D101', capacity: 2, occupied: 1, status: 'Partially occupied' },
  ],
  allocations: [
    { id: 'a-001', student: 'Achieng Mary', room: 'A101', hostel: 'Male Hostel', date: '2025-01-15', term: '2025/2026' },
    { id: 'a-002', student: 'Okello Peter', room: 'A102', hostel: 'Male Hostel', date: '2025-01-18', term: '2025/2026' },
    { id: 'a-003', student: 'Nyang’ Thon', room: 'B101', hostel: 'Female Hostel', date: '2025-01-20', term: '2025/2026' },
    { id: 'a-004', student: 'Wekesa Lucy', room: 'B101', hostel: 'Female Hostel', date: '2025-01-21', term: '2025/2026' },
  ],
  payments: [
    { id: 'p-001', student: 'Achieng Mary', amount: 150000, method: 'Bank', date: '2025-01-15', status: 'Paid' },
    { id: 'p-002', student: 'Okello Peter', amount: 150000, method: 'Mobile Money', date: '2025-01-16', status: 'Paid' },
    { id: 'p-003', student: 'Nyang’ Thon', amount: 150000, method: 'Bank', date: '2025-01-17', status: 'Pending' },
    { id: 'p-004', student: 'Wekesa Lucy', amount: 175000, method: 'Mobile Money', date: '2025-01-19', status: 'Paid' },
  ],
  maintenance: [
    { id: 'm-001', requestBy: 'Achieng Mary', issue: 'Leaking tap', location: 'Block A · A101', date: '2025-09-10', status: 'Pending' },
    { id: 'm-002', requestBy: 'Okello Peter', issue: 'Electric fault', location: 'Block A · A102', date: '2025-09-12', status: 'In Progress' },
    { id: 'm-003', requestBy: 'Nyang’ Thon', issue: 'Broken bed', location: 'Block B · B101', date: '2025-09-13', status: 'Resolved' },
  ],
  users: [
    { id: 'u-001', name: 'Admin User', email: 'admin@azu.ac.ug', role: 'Administrator', status: 'Active' },
    { id: 'u-002', name: 'Grace Otieno', email: 'grace@azu.ac.ug', role: 'Hostel Officer', status: 'Active' },
    { id: 'u-003', name: 'David Kimani', email: 'dkimani@azu.ac.ug', role: 'Finance Officer', status: 'Active' },
  ],
  settings: {
    universityName: 'Africa Zeal University',
    academicYear: '2025/2026',
    defaultHostel: 'Male Hostel',
    contactEmail: 'hostels@azu.ac.ug',
    hostelOptions: ['Male Hostel', 'Female Hostel', 'Graduate Hostel', 'International Hostel'],
  },
};

module.exports = seed;
