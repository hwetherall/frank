import requests
import pandas as pd
import time
import json
from datetime import datetime
import os

class InoveraLinkedInEnricher:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.scrapingdog.com/linkedin"
    
    def extract_linkedin_id(self, linkedin_url):
        """
        Extract LinkedIn ID from full LinkedIn URL
        Example: https://www.linkedin.com/in/mikaelklintberg -> mikaelklintberg
        """
        if not linkedin_url:
            return None
        
        # Handle different LinkedIn URL formats
        if '/in/' in linkedin_url:
            # Extract everything after /in/
            link_id = linkedin_url.split('/in/')[-1]
            # Remove any trailing slashes or query parameters
            link_id = link_id.split('/')[0].split('?')[0]
            return link_id
        elif '/company/' in linkedin_url:
            # For company profiles
            link_id = linkedin_url.split('/company/')[-1]
            link_id = link_id.split('/')[0].split('?')[0]
            return link_id
        else:
            # If it's already just an ID, return as is
            return linkedin_url.strip()
        
    def scrape_profile(self, linkedin_url, profile_type="profile"):
        """
        Scrape a single LinkedIn profile using Scraping Dog API
        """
        # Extract LinkedIn ID from the full URL
        link_id = self.extract_linkedin_id(linkedin_url)
        if not link_id:
            print(f"  ✗ Error: Could not extract LinkedIn ID from URL: {linkedin_url}")
            return None
        
        params = {
            'api_key': self.api_key,
            'type': profile_type,
            'linkId': link_id,
            'premium': 'true'
        }
        
        try:
            print(f"  Making API request for LinkedIn ID: {link_id}")
            response = requests.get(self.base_url, params=params, timeout=60)
            
            if response.status_code == 200:
                print(f"  ✓ Success: Received data")
                return response.json()
            elif response.status_code == 202:
                print(f"  ⏳ Processing... waiting 5 seconds")
                time.sleep(5)
                return self.scrape_profile(linkedin_url, profile_type)
            else:
                print(f"  ✗ Error {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"  ✗ Request failed: {e}")
            return None
    
    def extract_enriched_fields(self, profile_data):
        """
        Extract and flatten relevant fields from LinkedIn profile data
        """
        enriched = {}
        
        if not profile_data:
            return {
                'scraped_status': 'failed',
                'scraped_at': datetime.now().isoformat(),
                'scraped_headline': '',
                'scraped_location': '',
                'scraped_about': '',
                'scraped_followers': '',
                'scraped_connections': '',
                'scraped_current_company': '',
                'scraped_current_position': '',
                'scraped_experience_years': '',
                'scraped_education': '',
                'scraped_skills': '',
                'scraped_profile_url': ''
            }
        
        # Handle different response formats
        # If profile_data is a list, take the first item
        if isinstance(profile_data, list):
            if len(profile_data) > 0:
                profile_data = profile_data[0]
            else:
                # Empty list, treat as failed
                return {
                    'scraped_status': 'failed',
                    'scraped_at': datetime.now().isoformat(),
                    'scraped_headline': '',
                    'scraped_location': '',
                    'scraped_about': '',
                    'scraped_followers': '',
                    'scraped_connections': '',
                    'scraped_current_company': '',
                    'scraped_current_position': '',
                    'scraped_experience_years': '',
                    'scraped_education': '',
                    'scraped_skills': '',
                    'scraped_profile_url': ''
                }
        
        # Ensure we have a dictionary to work with
        if not isinstance(profile_data, dict):
            return {
                'scraped_status': 'failed',
                'scraped_at': datetime.now().isoformat(),
                'scraped_headline': '',
                'scraped_location': '',
                'scraped_about': '',
                'scraped_followers': '',
                'scraped_connections': '',
                'scraped_current_company': '',
                'scraped_current_position': '',
                'scraped_experience_years': '',
                'scraped_education': '',
                'scraped_skills': '',
                'scraped_profile_url': ''
            }
        
        # Basic fields
        enriched['scraped_status'] = 'success'
        enriched['scraped_at'] = datetime.now().isoformat()
        enriched['scraped_headline'] = profile_data.get('headline', '')
        enriched['scraped_location'] = profile_data.get('location', '')
        enriched['scraped_about'] = profile_data.get('about', '')[:500] if profile_data.get('about') else ''  # Limit length
        enriched['scraped_followers'] = profile_data.get('follower_count', '')
        enriched['scraped_connections'] = profile_data.get('connection_count', '')
        enriched['scraped_profile_url'] = profile_data.get('profile_url', '')
        
        # Current experience (most recent job)
        experiences = profile_data.get('experiences', [])
        if experiences and len(experiences) > 0:
            current_exp = experiences[0]
            enriched['scraped_current_company'] = current_exp.get('company_name', '')
            enriched['scraped_current_position'] = current_exp.get('title', '')
            enriched['scraped_experience_years'] = current_exp.get('duration', '')
        else:
            enriched['scraped_current_company'] = ''
            enriched['scraped_current_position'] = ''
            enriched['scraped_experience_years'] = ''
        
        # Education
        educations = profile_data.get('educations', [])
        if educations:
            education_list = []
            for edu in educations[:3]:  # Top 3 education entries
                school = edu.get('school_name', '')
                degree = edu.get('degree', '')
                if school:
                    if degree:
                        education_list.append(f"{degree} - {school}")
                    else:
                        education_list.append(school)
            enriched['scraped_education'] = "; ".join(education_list)
        else:
            enriched['scraped_education'] = ''
        
        # Skills (top 10)
        skills = profile_data.get('skills', [])
        if skills:
            enriched['scraped_skills'] = "; ".join(skills[:10])
        else:
            enriched['scraped_skills'] = ''
        
        return enriched
    
    def enrich_contacts_file(self, input_file, output_file=None, delay=3):
        """
        Read the existing Excel file and enrich it with LinkedIn data
        """
        # Read the existing Excel file
        print(f"📖 Reading existing data from: {input_file}")
        try:
            df = pd.read_excel(input_file)
            print(f"✓ Loaded {len(df)} contacts from Excel file")
        except Exception as e:
            print(f"✗ Error reading Excel file: {e}")
            return None
        
        # Display current columns
        print(f"📋 Current columns: {list(df.columns)}")
        
        # Check for LinkedIn column
        if 'LinkedIn' not in df.columns:
            print("✗ Error: No 'LinkedIn' column found in the Excel file")
            return None
        
        # Initialize new columns for enriched data
        enriched_columns = [
            'scraped_status', 'scraped_at', 'scraped_headline', 'scraped_location', 
            'scraped_about', 'scraped_followers', 'scraped_connections',
            'scraped_current_company', 'scraped_current_position', 'scraped_experience_years',
            'scraped_education', 'scraped_skills', 'scraped_profile_url'
        ]
        
        # Add empty columns for enriched data
        for col in enriched_columns:
            df[col] = ''
        
        print(f"\n🚀 Starting enrichment process for {len(df)} contacts...")
        print("=" * 60)
        
        # Process each contact
        for index, row in df.iterrows():
            contact_name = row.get('Name', f'Contact {index + 1}')
            linkedin_url = row.get('LinkedIn', '').strip()
            
            print(f"\n[{index + 1}/{len(df)}] Processing: {contact_name}")
            print(f"  LinkedIn URL: {linkedin_url}")
            
            if not linkedin_url:
                print("  ⚠️  No LinkedIn URL found, skipping...")
                df.loc[index, 'scraped_status'] = 'no_url'
                continue
            
            # Scrape the LinkedIn profile
            profile_data = self.scrape_profile(linkedin_url)
            
            # Extract enriched fields
            enriched_fields = self.extract_enriched_fields(profile_data)
            
            # Update the dataframe with enriched data
            for field, value in enriched_fields.items():
                df.loc[index, field] = value
            
            # Show summary of what was found
            if profile_data:
                headline = enriched_fields.get('scraped_headline', 'N/A')[:50]
                company = enriched_fields.get('scraped_current_company', 'N/A')
                print(f"  📊 Headline: {headline}...")
                print(f"  🏢 Company: {company}")
            
            # Add delay between requests (except for last one)
            if index < len(df) - 1:
                print(f"  ⏱️  Waiting {delay} seconds before next request...")
                time.sleep(delay)
        
        print("\n" + "=" * 60)
        print("🎉 Enrichment completed!")
        
        # Create output filename if not provided
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = os.path.splitext(input_file)[0]
            output_file = f"{base_name}_enriched_{timestamp}.xlsx"
        
        # Save the enriched data
        try:
            df.to_excel(output_file, index=False)
            print(f"✅ Enriched data saved to: {output_file}")
        except Exception as e:
            print(f"✗ Error saving file: {e}")
            return None
        
        # Print summary statistics
        successful = len(df[df['scraped_status'] == 'success'])
        failed = len(df[df['scraped_status'] == 'failed'])
        no_url = len(df[df['scraped_status'] == 'no_url'])
        
        print(f"\n📊 ENRICHMENT SUMMARY:")
        print(f"   Total contacts: {len(df)}")
        print(f"   Successfully enriched: {successful}")
        print(f"   Failed to enrich: {failed}")
        print(f"   No LinkedIn URL: {no_url}")
        print(f"   Success rate: {(successful/len(df)*100):.1f}%")
        
        return df

def main():
    """
    Main function to run the LinkedIn enrichment
    """
    # Your Scraping Dog API key
    API_KEY = "6873e035c1eb44ca8e06781c"
    
    # Input file (your Excel file)
    INPUT_FILE = "Contacts Table _ Innovera - Scraping Dog.xlsx"
    
    # Optional: specify output file name (if None, will auto-generate)
    OUTPUT_FILE = None  # Will create: "Contacts Table _ Innovera  Scraping Dog_enriched_YYYYMMDD_HHMMSS.xlsx"
    
    # Initialize the enricher
    enricher = InoveraLinkedInEnricher(API_KEY)
    
    # Run the enrichment
    print("🎯 INNOVERA LINKEDIN CONTACT ENRICHMENT")
    print("=" * 50)
    
    enriched_df = enricher.enrich_contacts_file(
        input_file=INPUT_FILE,
        output_file=OUTPUT_FILE,
        delay=3  # 3 seconds between requests to be respectful
    )
    
    if enriched_df is not None:
        print("\n✨ Enrichment process completed successfully!")
        print("\nYour enriched file contains:")
        print("📋 Original columns: Name, Company, Title, Industry, LinkedIn, Innovera Contact")
        print("🔍 New enriched columns:")
        print("   - scraped_headline: Current professional headline")
        print("   - scraped_location: Geographic location")
        print("   - scraped_about: Professional summary")
        print("   - scraped_followers: LinkedIn follower count")
        print("   - scraped_connections: LinkedIn connection count")
        print("   - scraped_current_company: Current company (from experience)")
        print("   - scraped_current_position: Current job title")
        print("   - scraped_education: Education background")
        print("   - scraped_skills: Professional skills")
        print("   - scraped_status: Success/failure status")
        print("   - scraped_at: Timestamp of when data was scraped")
    else:
        print("\n❌ Enrichment process failed. Please check the error messages above.")

if __name__ == "__main__":
    main()