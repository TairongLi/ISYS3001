import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  EmployeeRecord,
  ensureEmployeesSeeded,
  writeEmployees
} from '../../shared/employee-storage';

interface RosterEntry {
  id: number;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  location: string;
  task?: string;
  notes?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class AdminDashboardComponent {
  roster = signal<RosterEntry[]>(JSON.parse(localStorage.getItem('roster') || '[]'));
  newEntry: Partial<RosterEntry> = {};
  selectedWeek: string | null = null;
  employees = signal<EmployeeRecord[]>(ensureEmployeesSeeded());
  newEmployee: Partial<EmployeeRecord> = {};
  employeeFeedback = signal<{ message: string; tone: 'success' | 'error' } | null>(null);
  isEmployeePanelOpen = false;

  constructor(private router: Router) {}

  calculateHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startDate = new Date(0, 0, 0, sh, sm);
    const endDate = new Date(0, 0, 0, eh, em);
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return diff >= 0 ? diff : 0;
  }

  addRosterEntry() {
    if (this.newEntry.name && this.newEntry.date && this.newEntry.startTime && this.newEntry.endTime && this.newEntry.location) {
      const hours = this.calculateHours(this.newEntry.startTime, this.newEntry.endTime);
      const newId = this.roster().length ? Math.max(...this.roster().map(r => r.id)) + 1 : 1;
      this.roster.update(r => [...r, { id: newId, ...this.newEntry, hours } as RosterEntry]);
      localStorage.setItem('roster', JSON.stringify(this.roster()));
      this.newEntry = {};
    }
  }

  deleteEntry(id: number) {
    this.roster.update(r => r.filter(e => e.id !== id));
    localStorage.setItem('roster', JSON.stringify(this.roster()));
  }

  addEmployee() {
    this.employeeFeedback.set(null);
    if (!this.newEmployee.name || !this.newEmployee.phone || !this.newEmployee.email || !this.newEmployee.password) {
      return;
    }

    const trimmedEmail = this.newEmployee.email!.trim();
    const trimmedPhone = this.newEmployee.phone!.trim();

    if (this.employees().some(emp => emp.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      this.employeeFeedback.set({ message: 'Email already exists for another employee.', tone: 'error' });
      return;
    }

    const existingEmployees = this.employees();
    const nextId = existingEmployees.length
      ? Math.max(...existingEmployees.map(emp => emp.id)) + 1
      : 1;

    const updatedEmployees = [
      ...existingEmployees,
      {
        id: nextId,
        name: this.newEmployee.name.trim(),
        phone: trimmedPhone,
        email: trimmedEmail,
        password: this.newEmployee.password!.trim()
      }
    ];

    this.employees.set(updatedEmployees);
    writeEmployees(updatedEmployees);
    this.newEmployee = {};
    this.employeeFeedback.set({ message: 'Employee added successfully.', tone: 'success' });
  }

  openEmployeePanel() {
    this.isEmployeePanelOpen = true;
  }

  closeEmployeePanel() {
    this.isEmployeePanelOpen = false;
  }

  deleteEmployee(id: number) {
    const updatedEmployees = this.employees().filter(emp => emp.id !== id);
    this.employees.set(updatedEmployees);
    writeEmployees(updatedEmployees);
    this.employeeFeedback.set({ message: 'Employee removed.', tone: 'success' });
  }

  resetPassword(id: number) {
    const DEFAULT_PASSWORD = 'changeme123';
    const updatedEmployees = this.employees().map(emp =>
      emp.id === id ? { ...emp, password: DEFAULT_PASSWORD } : emp
    );
    this.employees.set(updatedEmployees);
    writeEmployees(updatedEmployees);
    const employee = updatedEmployees.find(emp => emp.id === id);
    this.employeeFeedback.set({
      message: employee ? `${employee.name}'s password reset to ${DEFAULT_PASSWORD}` : 'Password reset.',
      tone: 'success'
    });
  }

  trackEmployeeById(_index: number, employee: EmployeeRecord) {
    return employee.id;
  }

  logout() {
    this.router.navigate(['/login']);
  }

  // Monday → Sunday
  getWeekRange(date: Date): [Date, Date] {
    const day = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [monday, sunday];
  }

  currentWeekRange(): string {
    const [monday, sunday] = this.getWeekRange(new Date());
    return `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`;
  }

  currentWeekRoster = computed(() => {
    const [monday, sunday] = this.getWeekRange(new Date());
    return this.roster().filter(r => {
      const d = new Date(r.date);
      return d >= monday && d <= sunday;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  previousWeekRanges(): string[] {
    const weeks: Set<string> = new Set();
    this.roster().forEach(r => {
      const d = new Date(r.date);
      const [monday, sunday] = this.getWeekRange(d);
      const range = `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`;
      if (d < new Date()) weeks.add(range);
    });
    return Array.from(weeks).sort((a, b) => new Date(b.split(' - ')[0]).getTime() - new Date(a.split(' - ')[0]).getTime());
  }

  getRosterByWeek(range: string): RosterEntry[] {
    const [start, end] = range.split(' - ').map(d => new Date(d));
    return this.roster().filter(r => {
      const d = new Date(r.date);
      return d >= start && d <= end;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}
