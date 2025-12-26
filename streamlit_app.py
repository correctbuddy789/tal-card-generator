"""
TAL Company Card Generator - Streamlit POC
Generate viral company roast cards with an interactive web UI
"""

import streamlit as st
import base64
from pathlib import Path
from card_generator import (
    get_company_logo,
    generate_roast,
    generate_card,
)

# Page config
st.set_page_config(
    page_title="TAL Card Generator",
    page_icon="🧡",
    layout="centered",
)

# Load TAL logo
SCRIPT_DIR = Path(__file__).parent
TAL_LOGO_PATH = SCRIPT_DIR / "tal-logo.png"

# Custom CSS
st.markdown("""
<style>
    .stApp {
        max-width: 800px;
        margin: 0 auto;
    }
    .logo-container {
        display: flex;
        justify-content: center;
        margin-bottom: 10px;
    }
    .logo-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid #FF7A4D;
    }
    .title {
        text-align: center;
        color: #FF7A4D;
        margin-top: 10px;
    }
    .subtitle {
        text-align: center;
        color: #666;
    }
</style>
""", unsafe_allow_html=True)

# Logo and Title
if TAL_LOGO_PATH.exists():
    logo_base64 = base64.b64encode(TAL_LOGO_PATH.read_bytes()).decode()
    st.markdown(f"""
    <div class="logo-container">
        <img src="data:image/png;base64,{logo_base64}" class="logo-circle" alt="TAL Logo">
    </div>
    """, unsafe_allow_html=True)

st.markdown("<h1 class='title'>TAL Card Generator</h1>", unsafe_allow_html=True)
st.markdown("<p class='subtitle'>Generate viral company roast cards</p>", unsafe_allow_html=True)

st.divider()

# Input form
col1, col2 = st.columns(2)

with col1:
    company_name = st.text_input(
        "Company Name / Person Name",
        placeholder="e.g., Google, Zomato, TCS",
        help="Enter the company or person name to roast"
    )

with col2:
    role = st.text_input(
        "Role",
        value="Engineers",
        placeholder="e.g., Engineers, PMs, Founders",
        help="Enter the role/team to target"
    )

st.divider()

# Generate button
generate_clicked = st.button(
    "🎯 Generate Roast Card",
    type="primary",
    use_container_width=True,
    disabled=not company_name
)

# Generate card
if generate_clicked and company_name:
    with st.spinner("🤖 Generating your roast card..."):
        try:
            # Step 1: Get logo
            with st.status("Fetching company logo...", expanded=False) as status:
                logo_url = get_company_logo(company_name)
                if logo_url:
                    status.update(label="Logo found!", state="complete")
                else:
                    status.update(label="No logo found (continuing without)", state="complete")

            # Step 2: Generate roast
            with st.status("Generating roast...", expanded=False) as status:
                roast_result = generate_roast(company_name, role)
                roast_text = roast_result["roast"]
                status.update(label="Roast generated!", state="complete")

            # Step 3: Generate card image
            with st.status("Rendering card...", expanded=False) as status:
                image_bytes = generate_card(company_name, role, roast_text, logo_url)
                status.update(label="Card rendered!", state="complete")

            # Store in session state
            st.session_state["generated_card"] = {
                "image": image_bytes,
                "company": company_name,
                "role": role,
                "roast": roast_text,
                "input_tokens": roast_result["input_tokens"],
                "output_tokens": roast_result["output_tokens"],
                "cost": roast_result["cost"],
            }

        except Exception as e:
            st.error(f"Error generating card: {str(e)}")

# Display generated card
if "generated_card" in st.session_state:
    card_data = st.session_state["generated_card"]

    st.success("Card generated successfully!")

    # Show the roast text
    st.markdown(f"**Roast:** *\"{card_data['roast']}\"*")

    # # Show cost breakdown
    # if card_data.get("cost", 0) > 0:
    #     with st.expander("💰 Cost Breakdown", expanded=False):
    #         col1, col2, col3 = st.columns(3)
    #         with col1:
    #             st.metric("Input Tokens", f"{card_data['input_tokens']:,}")
    #         with col2:
    #             st.metric("Output Tokens", f"{card_data['output_tokens']:,}")
    #         with col3:
    #             st.metric("Total Cost", f"${card_data['cost']:.4f}")
    #         st.caption("Pricing: Input $2/1M tokens, Output $12/1M tokens, Search $0.014/query")

    # Display the card image
    st.image(card_data["image"], caption=f"TAL roasts {card_data['role']} at {card_data['company']}")

    # Download button
    filename = f"tal-{card_data['company'].lower().replace(' ', '-')}-{card_data['role'].lower().replace(' ', '-')}.png"
    st.download_button(
        label="📥 Download Card",
        data=card_data["image"],
        file_name=filename,
        mime="image/png",
        use_container_width=True,
    )

    # Regenerate button
    if st.button("🔄 Generate Another", use_container_width=True):
        del st.session_state["generated_card"]
        st.rerun()

# Footer
st.divider()
st.markdown(
    "<p style='text-align: center; color: #999; font-size: 12px;'>"
    "Made with 🧡 by TAL Team, at Grapevine"
    "</p>",
    unsafe_allow_html=True
)
