import pandas as pd
import numpy as np
from datetime import datetime
import os
from typing import Dict, List, Optional, Tuple, Any, Union


def convert_to_serializable(obj):
    """Convert NumPy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (list, tuple)):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    else:
        return obj


class DataModel:
    """Base class for handling data operations"""

    def __init__(self, data_path: Optional[str] = None):
        self.data_path = data_path
        self.data = None
        self.processed_data = None
        self.filtered_count = 0  # Track number of filtered entries

    def load_data(self, file_path: Optional[str] = None) -> pd.DataFrame:
        """Load data from a CSV file"""
        if file_path:
            self.data_path = file_path

        if not self.data_path:
            raise ValueError("No data path provided")

        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"File not found: {self.data_path}")

        # Check file extension
        _, ext = os.path.splitext(self.data_path)
        if ext.lower() == '.csv':
            # Try multiple delimiters to handle various CSV formats
            delimiters = [';', ',', '\t']
            for delimiter in delimiters:
                try:
                    self.data = pd.read_csv(self.data_path, delimiter=delimiter)
                    # If we successfully read the file, break out of the loop
                    break
                except Exception:
                    continue

            if self.data is None:
                raise ValueError(f"Could not parse CSV file with known delimiters: {self.data_path}")
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        # Apply filtering for long-duration transports
        self.filter_long_duration_transports()

        return self.data

    def filter_long_duration_transports(self, max_duration_minutes: float = 30.0) -> pd.DataFrame:
        """
        Filter out transports with duration longer than the specified threshold.

        Args:
            max_duration_minutes: Maximum allowed duration in minutes (default: 30.0)

        Returns:
            Filtered DataFrame
        """
        if self.data is None:
            raise ValueError("No data loaded")

        # Look for start and end time columns
        start_time_columns = [col for col in self.data.columns if
                              'start' in col.lower() and 'tid' in col.lower() and 'önskad' not in col.lower()]
        end_time_columns = [col for col in self.data.columns if
                            ('slut' in col.lower() or 'stop' in col.lower()) and 'tid' in col.lower()]

        if not start_time_columns or not end_time_columns:
            print("Could not identify start or end time columns for duration filtering")
            return self.data

        # Use "Uppdrag Starttid" and "Uppdrag Sluttid" if available
        start_time_column = "Uppdrag Starttid" if "Uppdrag Starttid" in self.data.columns else start_time_columns[0]
        end_time_column = "Uppdrag Sluttid" if "Uppdrag Sluttid" in self.data.columns else end_time_columns[0]

        print(f"Using columns for duration filtering: {start_time_column} and {end_time_column}")

        # Calculate durations
        original_row_count = len(self.data)
        valid_rows = []

        for idx, row in self.data.iterrows():
            start_time_str = row[start_time_column]
            end_time_str = row[end_time_column]

            # Skip rows with missing timestamps
            if pd.isna(start_time_str) or pd.isna(end_time_str):
                valid_rows.append(True)
                continue

            duration = self._calculate_duration_minutes(start_time_str, end_time_str)

            # Keep the row if duration is within limit
            valid_rows.append(duration <= max_duration_minutes)

        # Apply the filter
        filtered_data = self.data[valid_rows]
        self.filtered_count = original_row_count - len(filtered_data)

        print(f"Filtered out {self.filtered_count} transports with duration > {max_duration_minutes} minutes")
        print(
            f"Remaining transports: {len(filtered_data)} of {original_row_count} ({(len(filtered_data) / original_row_count) * 100:.1f}%)")

        # Update the data with filtered version
        self.data = filtered_data
        return self.data

    def _calculate_duration_minutes(self, start_time_str: str, end_time_str: str) -> float:
        """
        Calculate duration in minutes between two datetime strings.

        Args:
            start_time_str: Start time string
            end_time_str: End time string

        Returns:
            Duration in minutes (0.0 if calculation fails)
        """
        # Try to parse the datetime strings
        start_time = self._parse_datetime(start_time_str)
        end_time = self._parse_datetime(end_time_str)

        if not start_time or not end_time:
            return 0.0

        # Calculate the duration in minutes
        duration = (end_time - start_time).total_seconds() / 60.0

        # Check for negative durations (which would indicate data errors)
        if duration < 0:
            return 0.0

        return duration

    def _parse_datetime(self, datetime_str: str) -> Optional[datetime]:
        """
        Parse datetime strings in various formats.

        Args:
            datetime_str: Datetime string to parse

        Returns:
            Parsed datetime object or None if parsing failed
        """
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

    def get_column_names(self) -> List[str]:
        """Get column names from the loaded data"""
        if self.data is None:
            raise ValueError("No data loaded")

        return list(self.data.columns)

    def get_data_summary(self) -> Dict[str, Any]:
        """Get a summary of the loaded data"""
        if self.data is None:
            raise ValueError("No data loaded")

        summary = {
            "row_count": len(self.data),
            "column_count": len(self.data.columns),
            "columns": list(self.data.columns),
            "dtypes": {col: str(dtype) for col, dtype in self.data.dtypes.items()}
        }

        # Add information about filtered rows if any were filtered
        if self.filtered_count > 0:
            summary["filtered_count"] = self.filtered_count
            summary["filtered_reason"] = "Removed transports with duration > 30 minutes"

        return summary

    def filter_data(self, filters: Dict[str, Any]) -> pd.DataFrame:
        """Filter data based on criteria"""
        if self.data is None:
            raise ValueError("No data loaded")

        filtered_data = self.data.copy()

        for column, value in filters.items():
            if column in filtered_data.columns:
                filtered_data = filtered_data[filtered_data[column] == value]

        return filtered_data

    def get_unique_values(self, column: str) -> List[Any]:
        """Get unique values for a specific column"""
        if self.data is None:
            raise ValueError("No data loaded")

        if column not in self.data.columns:
            raise ValueError(f"Column not found: {column}")

        return self.data[column].unique().tolist()