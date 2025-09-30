export interface EmployeeRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  password: string;
}

export const EMPLOYEE_STORAGE_KEY = 'employees';

const DEFAULT_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 1,
    name: 'Staff One',
    phone: '0400000001',
    email: 'staff1@example.com',
    password: 'staffpass1'
  },
  {
    id: 2,
    name: 'Staff Two',
    phone: '0400000002',
    email: 'staff2@example.com',
    password: 'staffpass2'
  }
];

export function cloneEmployees(employees: EmployeeRecord[]): EmployeeRecord[] {
  return employees.map(e => ({ ...e }));
}

export function readEmployees(): EmployeeRecord[] {
  if (typeof localStorage === 'undefined') {
    return cloneEmployees(DEFAULT_EMPLOYEES);
  }

  const raw = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(DEFAULT_EMPLOYEES));
    return cloneEmployees(DEFAULT_EMPLOYEES);
  }

  try {
    const parsed = JSON.parse(raw) as EmployeeRecord[];
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map(emp => ({ ...emp }));
    }
  } catch (error) {
    console.warn('Failed to parse employee records, resetting to defaults.', error);
  }

  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(DEFAULT_EMPLOYEES));
  return cloneEmployees(DEFAULT_EMPLOYEES);
}

export function ensureEmployeesSeeded(): EmployeeRecord[] {
  return readEmployees();
}

export function writeEmployees(employees: EmployeeRecord[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(employees));
}

export function getDefaultEmployees(): EmployeeRecord[] {
  return cloneEmployees(DEFAULT_EMPLOYEES);
}
