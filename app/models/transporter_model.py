import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Union
from app.models.data_model import DataModel


class TransporterModel(DataModel):
    """Model for transporter data analysis"""

    def __init__(self, data_path: Optional[str] = None):
        super().__init__(data_path)
        self.transporters = None
        self.workload_stats = None
        self.hourly_stats = None

    def parse_datetime(self, datetime_str: str) -> Optional[datetime]:
        """Parse datetime strings in various formats"""
        if not datetime_str or pd.isna(datetime_str):
            return None

        # Try multiple date formats
        formats = [
            '%d-%m-%Y %H:%M:%S',  # 31-12-2023 22:36:16
            '%Y-%m-%d %H:%M:%S',  # 2023-12-31 22:36:16
            '%m/%d/%Y %H:%M:%S',  # 12/31/2023 22:36:16
            '%d/%m/%Y %H:%M:%S'  # 31/12/2023 22:36:16
        ]

        for fmt in formats:
            try:
                return datetime.strptime(datetime_str, fmt)
            except ValueError:
                continue

        # If all formats failed, log the error and return None
        print(f"Could not parse datetime: {datetime_str}")
        return None

    def calculate_duration_minutes(self, start_time_str: str, end_time_str: str) -> float:
        """Calculate duration in minutes between two datetime strings"""
        start_time = self.parse_datetime(start_time_str)
        end_time = self.parse_datetime(end_time_str)

        if not start_time or not end_time:
            return 0.0

        # Calculate the duration in minutes
        duration = (end_time - start_time).total_seconds() / 60.0

        # Check for negative durations (which would indicate data errors)
        if duration < 0:
            print(f"Warning: Negative duration calculated: {duration} minutes")
            print(f"Start time: {start_time}, End time: {end_time}")
            return 0.0

        return duration

    def preprocess_data(self) -> pd.DataFrame:
        """Preprocess the transport data for analysis"""
        if self.data is None:
            raise ValueError("No data loaded")

        # Create a copy to avoid modifying the original
        df = self.data.copy()

        # Identify the transporter ID column
        transporter_columns = [col for col in df.columns if 'transport' in col.lower() or 'personal' in col.lower()]
        if not transporter_columns:
            raise ValueError("Could not identify transporter ID column")

        # Use the first matching column as the transporter ID
        self.transporter_id_column = "Sekundär Servicepersonal Id"

        # Identify the start and end time columns
        start_time_columns = [col for col in df.columns if 'start' in col.lower() and 'tid' in col.lower()]
        end_time_columns = [col for col in df.columns if
                            ('slut' in col.lower() or 'stop' in col.lower()) and 'tid' in col.lower()]

        if not start_time_columns or not end_time_columns:
            raise ValueError("Could not identify start or end time columns")

        # Use "Uppdrag Starttid" and "Uppdrag Sluttid" if available
        self.start_time_column = "Uppdrag Starttid" if "Uppdrag Starttid" in df.columns else start_time_columns[0]
        self.end_time_column = "Uppdrag Sluttid" if "Uppdrag Sluttid" in df.columns else end_time_columns[0]

        print(f"Using transporter column: {self.transporter_id_column}")
        print(f"Using start time column: {self.start_time_column}")
        print(f"Using end time column: {self.end_time_column}")

        # Get unique transporters
        self.transporters = df[self.transporter_id_column].dropna().unique().tolist()
        print(f"Found {len(self.transporters)} unique transporters")

        # Filter out rows with missing transporter IDs or times
        valid_rows = df.dropna(subset=[self.transporter_id_column, self.start_time_column, self.end_time_column])
        print(f"Valid rows for analysis: {len(valid_rows)} of {len(df)} total")

        self.processed_data = valid_rows
        return valid_rows

    def analyze_workload(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Analyze transporter workload distribution"""
        if self.processed_data is None:
            self.preprocess_data()

        df = self.processed_data

        # Group the data by date and hour
        transports_by_date_hour = {}

        for _, row in df.iterrows():
            transporter_id = row[self.transporter_id_column]
            start_time_str = row[self.start_time_column]
            end_time_str = row[self.end_time_column]

            start_time = self.parse_datetime(start_time_str)
            end_time = self.parse_datetime(end_time_str)

            if not start_time or not end_time:
                continue

            # Calculate duration in minutes
            duration_minutes = self.calculate_duration_minutes(start_time_str, end_time_str)

            # Format date to YYYY-MM-DD
            date = start_time.strftime('%Y-%m-%d')

            # Get the hour of the start time
            hour = start_time.hour

            # Create a key for the date-hour combination
            date_hour_key = f"{date}-{hour}"

            if date_hour_key not in transports_by_date_hour:
                transports_by_date_hour[date_hour_key] = {
                    'date': date,
                    'hour': hour,
                    'transporters': {},
                    'total_duration': 0
                }

            # Add duration to transporter
            if transporter_id not in transports_by_date_hour[date_hour_key]['transporters']:
                transports_by_date_hour[date_hour_key]['transporters'][transporter_id] = 0

            transports_by_date_hour[date_hour_key]['transporters'][transporter_id] += duration_minutes
            transports_by_date_hour[date_hour_key]['total_duration'] += duration_minutes

        # Calculate workload distribution and inequality metrics
        workload_stats = []

        for date_hour_key, data in transports_by_date_hour.items():
            date = data['date']
            hour = data['hour']
            transporters = data['transporters']
            total_duration = data['total_duration']

            # Get number of transporters working during this hour
            num_transporters = len(transporters)

            # Skip hours with only one transporter (no inequality to measure)
            if num_transporters < 1:
                continue

            # Calculate expected equal workload per transporter (in %)
            expected_workload_percent = 100 / num_transporters if num_transporters > 0 else 0

            # Calculate actual workload percentages
            workload_percentages = {}
            for transporter_id, duration in transporters.items():
                workload_percentages[transporter_id] = (duration / total_duration) * 100 if total_duration > 0 else 0

            # Calculate inequality metrics
            percentages = list(workload_percentages.values())
            max_percent = max(percentages) if percentages else 0
            min_percent = min(percentages) if percentages else 0
            range_percent = max_percent - min_percent

            # Calculate standard deviation as a measure of inequality
            mean = sum(percentages) / len(percentages) if percentages else 0
            squared_diffs = [(val - mean) ** 2 for val in percentages]
            variance = sum(squared_diffs) / len(squared_diffs) if squared_diffs else 0
            std_dev = np.sqrt(variance)

            # Calculate Gini coefficient
            sorted_percentages = sorted(percentages)
            sum_of_differences = 0
            for i in range(len(sorted_percentages)):
                for j in range(len(sorted_percentages)):
                    sum_of_differences += abs(sorted_percentages[i] - sorted_percentages[j])

            sum_percentages = sum(sorted_percentages)
            gini = sum_of_differences / (2 * len(sorted_percentages) * sum_percentages) if sum_percentages > 0 and len(
                sorted_percentages) > 0 else 0

            workload_stats.append({
                'date': date,
                'hour': hour,
                'num_transporters': num_transporters,
                'total_duration_minutes': total_duration,
                'expected_workload_percent': expected_workload_percent,
                'range_percent': range_percent,
                'std_dev': std_dev,
                'gini': gini,
                'workload_details': workload_percentages,
                'date_hour': f"{date} {hour}:00"
            })

        # Sort by date and hour
        workload_stats.sort(key=lambda x: (x['date'], x['hour']))
        self.workload_stats = workload_stats

        # Calculate hourly statistics
        hourly_stats = []
        for hour in range(24):
            hour_data = [stat for stat in workload_stats if stat['hour'] == hour]

            if hour_data:
                avg_std_dev = sum(stat['std_dev'] for stat in hour_data) / len(hour_data)
                avg_gini = sum(stat['gini'] for stat in hour_data) / len(hour_data)
                avg_transporters = sum(stat['num_transporters'] for stat in hour_data) / len(hour_data)
                avg_range = sum(stat['range_percent'] for stat in hour_data) / len(hour_data)

                hourly_stats.append({
                    'hour': hour,
                    'avg_std_dev': avg_std_dev,
                    'avg_gini': avg_gini,
                    'avg_transporters': avg_transporters,
                    'avg_range': avg_range,
                    'count': len(hour_data),
                    'hour_formatted': f"{hour}:00"
                })

        self.hourly_stats = hourly_stats
        return workload_stats, hourly_stats

    def get_highest_inequality_periods(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get periods with highest inequality"""
        if not self.workload_stats:
            self.analyze_workload()

        # Sort by standard deviation (highest first)
        sorted_stats = sorted(self.workload_stats, key=lambda x: x['std_dev'], reverse=True)
        return sorted_stats[:limit]

    def get_lowest_inequality_periods(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get periods with lowest inequality"""
        if not self.workload_stats:
            self.analyze_workload()

        # Filter periods with more than one transporter
        multi_transporter_periods = [stat for stat in self.workload_stats if stat['num_transporters'] > 1]

        # Sort by standard deviation (lowest first)
        sorted_stats = sorted(multi_transporter_periods, key=lambda x: x['std_dev'])
        return sorted_stats[:limit]

    def get_transporter_summary(self) -> List[Dict[str, Any]]:
        """Get summary statistics for each transporter"""
        if self.processed_data is None:
            self.preprocess_data()

        df = self.processed_data

        transporter_summary = []
        for transporter in self.transporters:
            # Filter data for this transporter
            transporter_data = df[df[self.transporter_id_column] == transporter]

            # Calculate total transport time
            total_time = 0
            for _, row in transporter_data.iterrows():
                duration = self.calculate_duration_minutes(
                    row[self.start_time_column],
                    row[self.end_time_column]
                )
                total_time += duration

            # Calculate average transport duration
            avg_duration = total_time / len(transporter_data) if len(transporter_data) > 0 else 0

            # Find busiest hour
            transporter_by_hour = transporter_data.copy()
            transporter_by_hour['hour'] = transporter_by_hour[self.start_time_column].apply(
                lambda x: self.parse_datetime(x).hour if self.parse_datetime(x) else None
            )
            hour_counts = transporter_by_hour['hour'].value_counts()
            busiest_hour = hour_counts.idxmax() if not hour_counts.empty else None

            transporter_summary.append({
                'transporter_id': transporter,
                'total_transports': len(transporter_data),
                'total_minutes': total_time,
                'avg_duration': avg_duration,
                'busiest_hour': busiest_hour
            })

        # Sort by total transports
        transporter_summary.sort(key=lambda x: x['total_transports'], reverse=True)
        return transporter_summary