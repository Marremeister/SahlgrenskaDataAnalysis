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

        return self.data

    def get_column_names(self) -> List[str]:
        """Get column names from the loaded data"""
        if self.data is None:
            raise ValueError("No data loaded")

        return list(self.data.columns)

    def get_data_summary(self) -> Dict[str, Any]:
        """Get a summary of the loaded data"""
        if self.data is None:
            raise ValueError("No data loaded")

        return {
            "row_count": len(self.data),
            "column_count": len(self.data.columns),
            "columns": list(self.data.columns),
            "dtypes": {col: str(dtype) for col, dtype in self.data.dtypes.items()}
        }

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