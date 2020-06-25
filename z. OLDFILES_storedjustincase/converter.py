import pandas as pd

read_file = pd.read_excel('/Users/rishikavikondala/Desktop/excel.xlsx')
read_file.to_csv('/Users/rishikavikondala/Desktop/converted.csv', index = None, header=True)