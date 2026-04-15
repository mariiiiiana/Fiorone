# project implementation plan 

 You will build a web application that helps family members reflect on their misunderstandings between each other caused by issues of interpretation and communication as well as generational gaps. 

## core mechanics 
At the beginning, you are welcomed into a data collection phase, which serves to position you within the family system. This step creates a sort of “map” of the family: not only who you are, but also the generational perspective from which you view things.
If multiple people are participating, each person joins separately and completes their own profile. In this way, responses remain individual and are not directly influenced by others.
After the profiling phase, the experience moves into its core with three questions about their relationship dynamics.

## interaction pipeline
START
the user is presented with an introducory screen

User is presented the privacy policy 
[“agree”]
├─ Yes → interaction starts
└─ No → interaction ends 

First user profiling

3 reflective questions

Save to memory
↓
["add"?]
├─ Yes → New profiling → 3 questions → Save → repeat
└─ No

["are we ready"?]
├─ No → wait for new member / continue data collection
└─ Yes

Analysis of responses

Mapping onto:
- basic emotions
- derived emotions
- mental states
- relational needs

Comparison with other family groups

Creation of visual interface

Generation of 4 radar charts (1 per member)

Final feedback question

Restart / "start over"

END

## implementation guide
System Structure
Divide the system into three main modules:
* Input Module → handles user profiling and responses
* Processing Module → analyzes and encodes data
* Output Module → generates visualizations and feedback

2. Input Flow (Frontend Logic)
* Create a step-by-step interface:
    1. Profiling form (role, generation, family role)
    2. 3 open-ended questions
* Add triggers:
    * “add” → restart flow for a new user
    * “we are ready” → move to output phase
* Store each user as a separate entity (object)

3. Data Structure (Backend)
Define a user schema like:

{"id": "","role": "parent/child","generation": "","family_role": "","answers": {"misunderstood": "","missing": "","wish": ""},"analysis": {"basic_emotions": {},"derived_emotions": {},"mental_states": {},"relational_needs": {}}}

4. Text Analysis Engine
Call ollama to Implement NLP processing to:
* extract keywords and sentiment
* map text to predefined categories:
    * emotions
    * mental states
    * relational needs
Options:
* rule-based keyword matching (simpler)
* ML/NLP models (more advanced)

5. Scoring System
* Assign values (e.g. 0–10) to each category
* Normalize scores for radar visualization
* Ensure consistency across users

6. Comparison Logic
* Compute:
    * overlaps (shared high scores)
    * gaps (high vs low differences)
* Optionally compare with external dataset (other families)

7. Visualization Layer
* Generate radar charts (1 per user)
* use only:
    * D3.js

Each chart displays:
* Base emotion
* Derivative emotions
* mental states
* relational needs

8. Interface Design
* Show:
    * individual radar charts
    * shared emotional patterns


    BASIC EMOTIONS
    {
        "Joy": 0,
        "Sadness": 0,
        "Anger": 0,
        "Fear": 0,
        "Disgust": 0,
        "Surprise": 0
    }

    DERIVED EMOTIONS
    {
        "Enthusiasm": 0,
        "Gratitude": 0,
        "Pride": 0,
        "Love": 0,
        "Satisfaction": 0,
        "Relief": 0,

        "Affliction": 0,
        "Loneliness": 0,
        "Despair": 0,
        "Disappointment": 0,
        "Nostalgia": 0,

        "Frustration": 0,
        "Impatience": 0,
        "Resentment": 0,

        "Anxiety": 0,
        "Insecurity": 0,
        "Stress": 0,
        "Panic": 0,
        "Worry": 0,

        "Shame": 0,
        "Guilt": 0,
        "Jealousy": 0,
        "Envy": 0,
        "Helplessness": 0
    }

    MENTAL STATES


{
    "Overthinking": 0,
    "Confusion": 0,
    "Apathy": 0,
    "Boredom": 0,
    "Mental fatigue": 0,
    "Indifference": 0,
    "Disinterest": 0,
    "Uncertainty": 0,
    "Dissociation / detachment": 0,
    "Feeling overwhelmed": 0
}

RELATIONAL NEEDS

{
    "Feeling heard": 0,
    "Feeling understood": 0,
    "Feeling accepted": 0,
    "Feeling valued": 0,
    "Feeling safe": 0,
    "Feeling free to be yourself": 0,
    "Empathy": 0,
    "Connection": 0,
    "Authentic dialogue": 0,
    "Belonging": 0
}


9. Feedback System
* Final question (e.g. “Did this help you reflect?”)
* Store feedback for iteration/improvement

10. Iteration Loop
* Allow restart (“start again”)
* Keep sessions independent or optionally saved

## general rules
* No CSS except for basic layouts - this is still a wireframe
* Keep UI minimal and reflective, not gamified
* The system must ensure that each participant interacts independently, without being influenced by other family members’ responses.
*  All inputs should be treated as personal and subjective perspectives, not as objective truths.
* The agent must remain neutral at all times, avoiding judgment, interpretation bias, or assigning responsibility. Its role is to facilitate reflection, not to provide solutions or determine who is right, and it does not summarise each users’ responses after each interaction; it stores the answers and uses them to compare them between family members and other  future users. 
* User responses must be relevant to the questions asked. If a participant provides unrelated or disengaged input, the system should interrupt the experience and invite them to continue only if they are willing to engage meaningfully and the ai informed the unwilling user about AI energy usage.
* All collected data should be structured consistently to allow comparison across users, while preserving the individuality of each response. Privacy and separation between participants must be maintained throughout the process.
* Finally, the system should prioritize clarity and simplicity in both interaction and output, ensuring that the experience remains accessible, reflective, and repeatable over time.