import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

async function test() {
  try {
    console.log('\n🧪 Testing Privacy Scanner (without resumeId)...');
    const privacyRes = await fetch(`${BASE_URL}/privacy/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'My email is john@example.com and my phone is 555-123-4567'
      })
    });
    
    const privacyData = await privacyRes.json();
    console.log('Privacy Response:', JSON.stringify(privacyData, null, 2));
    
    console.log('\n🧪 Testing Job Applications (without resumeId)...');
    const jobRes = await fetch(`${BASE_URL}/jobs/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Senior Developer',
        company: 'Tech Corp',
        jobUrl: 'https://example.com/job/123',
        jobDescription: 'Looking for a senior developer with 5+ years of experience'
      })
    });
    
    const jobData = await jobRes.json();
    console.log('Job Application Response:', JSON.stringify(jobData, null, 2));
    
    console.log('\n🧪 Testing Skill Roadmap (without resumeId)...');
    const skillRes = await fetch(`${BASE_URL}/skills/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        missingSkills: ['React', 'Docker', 'GraphQL'],
        targetRole: 'Full Stack Developer'
      })
    });
    
    const skillData = await skillRes.json();
    console.log('Skill Roadmap Response:', JSON.stringify(skillData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
