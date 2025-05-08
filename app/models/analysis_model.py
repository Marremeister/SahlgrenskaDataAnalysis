import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Callable, Tuple
from app.models.data_model import DataModel


class AnalysisModel(DataModel):
    """
    Extensible model for different types of analyses.
    This class provides a framework for adding new analysis types.
    """

    def __init__(self, data_path: Optional[str] = None, max_duration_minutes: float = 30.0):
        super().__init__(data_path)
        self.analysis_results = {}
        self.available_analyses = self._register_analyses()
        self.max_duration_minutes = max_duration_minutes

    def _register_analyses(self) -> Dict[str, Callable]:
        """
        Register all available analysis methods.
        New analysis methods should be added here.
        """
        return {
            'hourly_activity': self.analyze_hourly_activity,
            'transport_types': self.analyze_transport_types,
            'location_frequency': self.analyze_location_frequency,
            'transport_duration': self.analyze_transport_duration,
            'priority_analysis': self.analyze_priority_distribution
        }

    def get_available_analyses(self) -> List[str]:
        """Get list of available analysis types"""
        return list(self.available_analyses.keys())

    def run_analysis(self, analysis_type: str, **kwargs) -> Dict[str, Any]:
        """Run a specific type of analysis"""
        if analysis_type not in self.available_analyses:
            raise ValueError(f"Unknown analysis type: {analysis_type}")

        if self.data is None:
            raise ValueError("No data loaded")

        result = self.available_analyses[analysis_type](**kwargs)
        self.analysis_results[analysis_type] = result
        return result

    def run_all_analyses(self) -> Dict[str, Dict[str, Any]]:
        """Run all available analyses"""
        results = {}
        for analysis_type in self.available_analyses:
            results[analysis_type] = self.run_analysis(analysis_type)
        return results

    def analyze_hourly_activity(self, date_column: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Analyze hourly activity patterns

        Returns:
            Dict with hourly activity counts and percentages
        """
        if self.data is None:
            raise ValueError("No data loaded")

        # Try to identify date column if not provided
        if not date_column:
            date_columns = [col for col in self.data.columns if
                            'starttid' in col.lower() or 'start' in col.lower() and 'tid' in col.lower()]
            if date_columns:
                date_column = date_columns[0]
            else:
                raise ValueError("Could not identify a date column")

        try:
            # Extract hour from the date column
            from datetime import datetime

            def extract_hour(date_str):
                """Extract hour from date string"""
                formats = [
                    '%d-%m-%Y %H:%M:%S',  # 31-12-2023 22:36:16
                    '%Y-%m-%d %H:%M:%S',  # 2023-12-31 22:36:16
                    '%m/%d/%Y %H:%M:%S',  # 12/31/2023 22:36:16
                    '%d/%m/%Y %H:%M:%S'  # 31/12/2023 22:36:16
                ]

                if pd.isna(date_str):
                    return None

                for fmt in formats:
                    try:
                        return datetime.strptime(date_str, fmt).hour
                    except ValueError:
                        continue

                # If none of the formats match, try extracting from column
                if 'timme' in self.data.columns or 'hour' in self.data.columns:
                    hour_col = 'timme' if 'timme' in self.data.columns else 'hour'
                    return self.data[hour_col]

                return None

            self.data['hour'] = self.data[date_column].apply(extract_hour)
            hourly_counts = self.data['hour'].value_counts().sort_index()
            total_count = hourly_counts.sum()
            hourly_percentages = (hourly_counts / total_count * 100).round(2)

            # Create a complete hourly dataset (including hours with 0 counts)
            all_hours = list(range(24))
            complete_counts = [hourly_counts.get(hour, 0) for hour in all_hours]
            complete_percentages = [hourly_percentages.get(hour, 0) for hour in all_hours]

            result = {
                'hours': all_hours,
                'counts': complete_counts,
                'percentages': complete_percentages,
                'peak_hour': hourly_counts.idxmax() if not hourly_counts.empty else None,
                'slowest_hour': hourly_counts.idxmin() if hourly_counts.min() > 0 and not hourly_counts.empty else None,
                'total': total_count,
                'max_duration_filter': self.max_duration_minutes
            }

            return result
        except Exception as e:
            print(f"Error in hourly analysis: {e}")
            # Return empty result if analysis fails
            return {
                'hours': list(range(24)),
                'counts': [0] * 24,
                'percentages': [0] * 24,
                'peak_hour': None,
                'slowest_hour': None,
                'total': 0,
                'error': str(e),
                'max_duration_filter': self.max_duration_minutes
            }

    def analyze_transport_types(self, type_column: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Analyze distribution of transport types

        Returns:
            Dict with transport type counts and percentages
        """
        if self.data is None:
            raise ValueError("No data loaded")

        # Try to identify transport type column if not provided
        if not type_column:
            type_columns = [col for col in self.data.columns
                            if 'transportmedel' in col.lower()
                            or 'transport' in col.lower() and 'typ' in col.lower()
                            or 'uppdragstyp' in col.lower()]
            if type_columns:
                type_column = type_columns[0]
            else:
                raise ValueError("Could not identify a transport type column")

        try:
            type_counts = self.data[type_column].value_counts()
            total_count = type_counts.sum()
            type_percentages = (type_counts / total_count * 100).round(2)

            return {
                'types': type_counts.index.tolist(),
                'counts': type_counts.values.tolist(),
                'percentages': type_percentages.values.tolist(),
                'most_common': type_counts.index[0] if not type_counts.empty else None,
                'least_common': type_counts.index[-1] if not type_counts.empty else None,
                'total': total_count,
                'max_duration_filter': self.max_duration_minutes
            }
        except Exception as e:
            print(f"Error in transport type analysis: {e}")
            # Return empty result if analysis fails
            return {
                'types': [],
                'counts': [],
                'percentages': [],
                'most_common': None,
                'least_common': None,
                'total': 0,
                'error': str(e),
                'max_duration_filter': self.max_duration_minutes
            }

    def analyze_location_frequency(self, location_column: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Analyze frequency of start and end locations

        Returns:
            Dict with location frequency data
        """
        if self.data is None:
            raise ValueError("No data loaded")

        # Try to identify location columns
        start_location_columns = [col for col in self.data.columns if
                                  'startplats' in col.lower() and 'id' not in col.lower()]
        end_location_columns = [col for col in self.data.columns if
                                'slutplats' in col.lower() and 'id' not in col.lower()]

        if not start_location_columns or not end_location_columns:
            raise ValueError("Could not identify start or end location columns")

        start_location_column = start_location_columns[0]
        end_location_column = end_location_columns[0]

        try:
            # Analyze start locations
            start_counts = self.data[start_location_column].value_counts().head(10)
            start_percentages = (start_counts / len(self.data) * 100).round(2)

            # Analyze end locations
            end_counts = self.data[end_location_column].value_counts().head(10)
            end_percentages = (end_counts / len(self.data) * 100).round(2)

            # Find most common routes (start -> end)
            self.data['route'] = self.data[start_location_column] + ' → ' + self.data[end_location_column]
            route_counts = self.data['route'].value_counts().head(10)
            route_percentages = (route_counts / len(self.data) * 100).round(2)

            return {
                'start_locations': {
                    'names': start_counts.index.tolist(),
                    'counts': start_counts.values.tolist(),
                    'percentages': start_percentages.values.tolist()
                },
                'end_locations': {
                    'names': end_counts.index.tolist(),
                    'counts': end_counts.values.tolist(),
                    'percentages': end_percentages.values.tolist()
                },
                'routes': {
                    'names': route_counts.index.tolist(),
                    'counts': route_counts.values.tolist(),
                    'percentages': route_percentages.values.tolist()
                },
                'max_duration_filter': self.max_duration_minutes
            }
        except Exception as e:
            print(f"Error in location frequency analysis: {e}")
            # Return empty result if analysis fails
            return {
                'start_locations': {'names': [], 'counts': [], 'percentages': []},
                'end_locations': {'names': [], 'counts': [], 'percentages': []},
                'routes': {'names': [], 'counts': [], 'percentages': []},
                'error': str(e),
                'max_duration_filter': self.max_duration_minutes
            }

    def analyze_transport_duration(self, **kwargs) -> Dict[str, Any]:
        """
        Analyze transport duration statistics

        Returns:
            Dict with duration statistics
        """
        if self.data is None:
            raise ValueError("No data loaded")

        # Identify start and end time columns
        start_time_columns = [col for col in self.data.columns if
                              'start' in col.lower() and 'tid' in col.lower() and 'önskad' not in col.lower()]
        end_time_columns = [col for col in self.data.columns if
                            ('slut' in col.lower() or 'stop' in col.lower()) and 'tid' in col.lower()]

        if not start_time_columns or not end_time_columns:
            raise ValueError("Could not identify start or end time columns")

        start_time_column = "Uppdrag Starttid" if "Uppdrag Starttid" in self.data.columns else start_time_columns[0]
        end_time_column = "Uppdrag Sluttid" if "Uppdrag Sluttid" in self.data.columns else end_time_columns[0]

        try:
            # Create a new column for duration
            durations = []
            for _, row in self.data.iterrows():
                duration = self._calculate_duration_minutes(
                    row[start_time_column],
                    row[end_time_column]
                )
                durations.append(duration)

            durations = np.array(durations)
            durations = durations[durations > 0]  # Filter out zero/negative durations

            # Note: Now that we've implemented filtering in DataModel, all durations should be <= max_duration_minutes
            # But we can still enforce it here as a safety check
            durations = durations[durations <= self.max_duration_minutes]

            if len(durations) == 0:
                return {
                    'min': 0,
                    'max': 0,
                    'mean': 0,
                    'median': 0,
                    'std': 0,
                    'count': 0,
                    'histogram': {
                        'bins': list(range(0, int(self.max_duration_minutes) + 5, 5)),
                        'values': [0] * ((int(self.max_duration_minutes) + 5) // 5)
                    },
                    'max_duration_filter': self.max_duration_minutes
                }

            # Calculate histogram data - use a bin range that includes our max duration
            bin_range = range(0, int(self.max_duration_minutes) + 5, 5)
            hist, bin_edges = np.histogram(durations, bins=bin_range)

            return {
                'min': np.min(durations),
                'max': np.max(durations),
                'mean': np.mean(durations),
                'median': np.median(durations),
                'std': np.std(durations),
                'count': len(durations),
                'histogram': {
                    'bins': bin_edges[:-1].tolist(),
                    'values': hist.tolist()
                },
                'max_duration_filter': self.max_duration_minutes
            }
        except Exception as e:
            print(f"Error in transport duration analysis: {e}")
            # Return empty result if analysis fails
            return {
                'min': 0,
                'max': 0,
                'mean': 0,
                'median': 0,
                'std': 0,
                'count': 0,
                'histogram': {
                    'bins': list(range(0, int(self.max_duration_minutes) + 5, 5)),
                    'values': [0] * ((int(self.max_duration_minutes) + 5) // 5)
                },
                'error': str(e),
                'max_duration_filter': self.max_duration_minutes
            }

    def analyze_priority_distribution(self, priority_column: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Analyze distribution of transport priorities

        Returns:
            Dict with priority distribution data
        """
        if self.data is None:
            raise ValueError("No data loaded")

        # Try to identify priority column if not provided
        if not priority_column:
            priority_cols = [col for col in self.data.columns if 'prioritet' in col.lower()]
            if priority_cols:
                priority_column = priority_cols[0]
            else:
                raise ValueError("Could not identify a priority column")

        try:
            priority_counts = self.data[priority_column].value_counts()
            total_count = priority_counts.sum()
            priority_percentages = (priority_counts / total_count * 100).round(2)

            # Calculate priority distribution by hour
            if 'hour' not in self.data.columns:
                # If hourly analysis hasn't been run yet, create hour column
                date_columns = [col for col in self.data.columns if
                                'starttid' in col.lower() or 'start' in col.lower() and 'tid' in col.lower()]
                if date_columns:
                    date_column = date_columns[0]
                    self.data['hour'] = self.data[date_column].apply(
                        lambda x: self._parse_datetime(x).hour if self._parse_datetime(x) else None
                    )

            hourly_priority = {}
            if 'hour' in self.data.columns:
                for hour in range(24):
                    hour_data = self.data[self.data['hour'] == hour]
                    if not hour_data.empty:
                        hour_counts = hour_data[priority_column].value_counts()
                        hour_total = hour_counts.sum()
                        hour_percentages = (hour_counts / hour_total * 100).round(2)
                        hourly_priority[hour] = {
                            'priorities': hour_counts.index.tolist(),
                            'counts': hour_counts.values.tolist(),
                            'percentages': hour_percentages.values.tolist(),
                            'total': hour_total
                        }

            return {
                'priorities': priority_counts.index.tolist(),
                'counts': priority_counts.values.tolist(),
                'percentages': priority_percentages.values.tolist(),
                'total': total_count,
                'hourly_distribution': hourly_priority,
                'max_duration_filter': self.max_duration_minutes
            }
        except Exception as e:
            print(f"Error in priority distribution analysis: {e}")
            # Return empty result if analysis fails
            return {
                'priorities': [],
                'counts': [],
                'percentages': [],
                'total': 0,
                'hourly_distribution': {},
                'error': str(e),
                'max_duration_filter': self.max_duration_minutes
            }