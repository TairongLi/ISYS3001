import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class StaffDashboardComponent {
  roster = signal<RosterEntry[]>(JSON.parse(localStorage.getItem('roster') || '[]'));

  selectedWeek: string | null = null;

  constructor() {
    window.addEventListener('storage', () => {
      this.roster.set(JSON.parse(localStorage.getItem('roster') || '[]'));
    });
  }

  // 🔹 Current week (Mon–Sun)
  currentWeekRoster = computed(() => {
    const now = new Date();
    const monday = this.getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return this.roster().filter(r => {
      const d = new Date(r.date);
      return d >= monday && d <= sunday;
    });
  });

  currentWeekRange() {
    const now = new Date();
    const monday = this.getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`;
  }

  // 🔹 Previous weeks (Mon–Sun)
  previousWeekRanges() {
    const ranges: string[] = [];
    const now = new Date();
    let monday = this.getMonday(now);

    // go back until no rosters left
    while (true) {
      const prevSunday = new Date(monday);
      prevSunday.setDate(monday.getDate() - 1);
      monday.setDate(monday.getDate() - 7);

      const range = `${monday.toLocaleDateString()} - ${prevSunday.toLocaleDateString()}`;
      const hasRoster = this.roster().some(r => {
        const d = new Date(r.date);
        return d >= monday && d <= prevSunday;
      });

      if (!hasRoster) break;
      ranges.push(range);
    }
    return ranges;
  }

  getRosterByWeek(weekRange: string) {
    const [startStr, endStr] = weekRange.split(' - ');
    const start = new Date(startStr);
    const end = new Date(endStr);
    return this.roster().filter(r => {
      const d = new Date(r.date);
      return d >= start && d <= end;
    });
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  // 🔹 Add logout so staff.html works
  logout() {
    localStorage.removeItem('staffSession'); // optional: clear session
    window.location.href = '/'; // redirect to login/home
  }
}
