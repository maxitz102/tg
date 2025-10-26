/**
 * Utility functions for CSV export functionality
 */

export interface TimeRecord {
  id: string;
  userId: string;
  checkIn: Date;
  checkOut?: Date;
  totalHours?: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Schedule {
  id: string;
  userId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  shiftType?: string;
  departmentId?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  department?: {
    name: string;
  };
}

/**
 * Converts data to CSV format
 */
export const convertToCSV = (data: any[], headers: string[]): string => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  const csvContent = [
    // Headers
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = getNestedValue(row, header);
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  return csvContent;
};

/**
 * Gets nested object values using dot notation
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
};

/**
 * Formats date for CSV export
 */
export const formatDateForCSV = (date: Date | string | any): string => {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date.toDate && typeof date.toDate === 'function') {
    // Firebase Timestamp
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }
  
  return dateObj.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Formats duration in hours for CSV export
 */
export const formatHoursForCSV = (hours: number | undefined): string => {
  if (hours === undefined || hours === null) return '';
  return hours.toFixed(2).replace('.', ',');
};

/**
 * Downloads CSV file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Generates filename with timestamp
 */
export const generateFilename = (prefix: string, extension: string = 'csv'): string => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
};
