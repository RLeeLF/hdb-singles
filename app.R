library(shiny)
library(bslib)
library(dplyr)
library(ggplot2)
library(tibble)
library(tidyr)
library(readr)

# ==========================================
# 1. PRE-LOAD MODEL ARTIFACTS & DATA LOOKUPS
# ==========================================

# ---- Part 5.1: the canonical artefact ----
# Single source of truth, replacing three previously-separate hardcoded
# structures: town_cluster_lookup (hand-typed, had drifted from the real
# clustering and had a Sengkang spelling bug), app_start_psf_data /
# app_growth_data (12-row placeholders), and the flat $380,000 BTO price.
# Built in HDB_capstone_v3.R (Part 5.1), asserted for complete resale
# coverage at build time (Part 5.2 build-time half) before export.
ARTEFACT_PATH <- "model_outputs/housing_projection_matrix.csv"

if (!file.exists(ARTEFACT_PATH)) {
  stop(
    "Missing ", ARTEFACT_PATH, ". Run the Part 5.1 artefact-assembly block ",
    "in HDB_capstone_v3.R first (after growth_matrix_dynamic, before PHASE 4) ",
    "— it writes this file. app.R cannot run without it."
  )
}

housing_projection_matrix <- read_csv(ARTEFACT_PATH, show_col_types = FALSE)

LEASE_GRID <- seq(40, 95, by = 5)

stopifnot(
  setequal(
    unique(housing_projection_matrix$remaining_lease_yrs[housing_projection_matrix$path == "Resale Purchase"]),
    LEASE_GRID
  )
)

ALL_TOWNS <- housing_projection_matrix %>%
  filter(path == "Resale Purchase") %>%
  distinct(town) %>%
  arrange(town) %>%
  pull(town)

# ---- Financial arithmetic: single source of truth ----
# rules, monthly_payment(), check_msr_tdsr(), compute_equity() all come
# from here — do NOT redefine any of them locally in this file. The same
# file is sourced by HDB_capstone_v3.R and generate_financial_fixtures.R;
# a fourth independent copy here is exactly the drift risk that produced
# the k >= n balance bug caught and fixed earlier this session.
source("financial_rules.R")

# ---- Singles Scheme eligibility ----
# Under the Single Singapore Citizen (SSC) Scheme, the 2-Room-only restriction
# applies specifically to NEW (BTO) flats. It does NOT restrict resale flat
# type — a single buyer may legally purchase 3/4/5-room resale flats.
SINGLES_BTO_FLAT_TYPES <- c("2_ROOM")

# ==========================================
# 2. USER INTERFACE (UI)
# ==========================================
ui <- fluidPage(
  theme = bslib::bs_theme(bootswatch = "cerulean"),
  
  # Inject Third-Party Tracking Scripts & Meta Tags
  tags$head(
    tags$script(src = "clarity.js"),
    
    # Custom CSS Styles
    tags$style(HTML("
      .hero-banner {
        width: 100%;
        height: auto;
        max-height: 350px;
        object-fit: cover;
        border-radius: 6px;
        margin-bottom: 25px;
      }
      .sidebar-panel {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
    "))
  ),
  
  div(
    img(src = "hdbimage.jpg", class = "hero-banner")
  ),
  
  titlePanel("For Singles Age 35 : HDB Housing Strategy Calculator"),
  p("Empirical 5-year forecasting and cash flow feasibility mapping across multiple housing configurations."),
  hr(),
  
  sidebarLayout(
    sidebarPanel(
      class = "sidebar-panel",
      tags$h4("Step 1: Property Configurations"),
      
      selectizeInput(
        inputId = "selected_towns",
        label   = "Select Target Towns (Choose one or multiple):",
        choices  = ALL_TOWNS,
        selected = "PUNGGOL",
        multiple = TRUE,
        options  = list(placeholder = 'Select towns...')
      ),
      
      checkboxGroupInput(
        inputId  = "selected_room_types",
        label    = "Select Flat Sizes to Compare:",
        choices  = c("2-Room" = "2_ROOM", "3-Room" = "3_ROOM",
                     "4-Room" = "4_ROOM", "5-Room" = "5_ROOM"),
        selected = "4_ROOM",
        inline   = TRUE
      ),
      
      # ---- Part 2: lease slider ----
      sliderInput(
        inputId = "remaining_lease",
        label   = "Remaining Lease (years):",
        min     = min(LEASE_GRID),
        max     = max(LEASE_GRID),
        value   = 75,
        step    = 5
      ),
      uiOutput("lease_reminder"),
      
      hr(),
      tags$h4("Step 2: Financial & Budget Bounds"),
      
      sliderInput(
        inputId = "monthly_budget",
        label   = "Maximum Comfortable Monthly Housing Budget Cash & CPF ($/month):",
        min     = 1000,
        max     = 10000,
        value   = 3500,
        step    = 100,
        pre     = "$"
      ),
      
      numericInput(
        inputId = "cash_injection",
        label   = "Available Cash / CPF Downpayment (For Resale Path):",
        value   = 100000,
        min     = 0,
        step    = 5000
      ),
      
      hr(),
      tags$h4("Step 3: Factor in Interest Rate and Rental"),
      
      numericInput(
        inputId = "interest_rate",
        label   = "Annual Mortgage Interest Rate (%):",
        value   = 3.5,
        min     = 1.0,
        max     = 10.0,
        step    = 0.1
      ),
      tags$span(
        style = "font-size: 0.85em; color: #6c757d; margin-top: -10px; display: block; margin-bottom: 15px;",
        "Reference Benchmarks: HDB Concessionary ~2.6% | Bank Low ~3.5% | Bank High ~4.5%"
      ),
      numericInput(
        inputId = "base_rent",
        label   = "Current Monthly Rental Baseline ($):",
        value   = 2200,
        min     = 1000,
        step    = 100
      ),
      
      hr(),
      tags$h4("Step 4: Loan Eligibility (MSR/TDSR)"),
      
      numericInput(
        inputId = "gross_monthly_income",
        label   = "Gross Monthly Income ($):",
        value   = 6000,
        min     = 0,
        step    = 100
      ),
      numericInput(
        inputId = "existing_monthly_debt",
        label   = "Existing Monthly Debt (car loan, credit cards, etc) ($):",
        value   = 0,
        min     = 0,
        step    = 50
      ),
      tags$span(
        style = "font-size: 0.85em; color: #6c757d; margin-top: -10px; display: block; margin-bottom: 15px;",
        "Eligibility is checked at MAS's mandatory 4% stress-test rate, regardless of the rate entered above — this is separate from your actual projected cash flow."
      )
    ),
    
    mainPanel(
      tabsetPanel(
        tabPanel("Future 5-Year Housing Wealth Projection Matrix",
                 br(),
                 plotOutput("networth_plot", height = "500px"),
                 br(),
                 tags$h4("Granular Financial Breakdown Table"),
                 tableOutput("summary_table")),
        
        tabPanel("Strategic Recommendations",
                 br(),
                 textOutput("recommendation_text"))
      )
    )
  )
)

# =====================================================================
# PART 3: DYNAMIC SERVER CONTROLLER REGIME (server)
# =====================================================================
server <- function(input, output, session) {
  
  # ---- Part 2: CPF/tenure reminder ----
  output$lease_reminder <- renderUI({
    req(input$remaining_lease)
    if (input$remaining_lease < 60) {
      tags$div(
        style = "background-color:#fff3cd; border:1px solid #ffe69c; border-radius:6px; padding:10px; margin-top:-5px; margin-bottom:15px; font-size:0.85em;",
        tags$strong("Note: "),
        "CPF usage is reduced once remaining lease drops below 60 years. HDB loan tenure is also capped at the shorter of 25 years, (65 \u2212 your age), or the flat's remaining lease \u2014 this is not a hard block in this tool, but confirm your actual eligibility with HDB/a bank before relying on these projections."
      )
    }
  })
  
  results_data <- reactive({
    req(input$selected_towns, input$selected_room_types, input$interest_rate, input$remaining_lease)
    
    interest_rate <- input$interest_rate / 100
    
    sim_grid <- crossing(
      town      = input$selected_towns,
      flat_type = input$selected_room_types
    )
    
    h <- rules$horizon_years
    
    simulation_output <- sim_grid %>%
      rowwise() %>%
      do({
        current_town <- .$town
        current_ft   <- .$flat_type
        
        # ---- Part 5.2 (serve-time parity gate): RESALE ----
        # Coverage of the full crossing(town, flat_type, lease) grid was
        # asserted at build time in HDB_capstone_v3.R — every valid
        # combination MUST have a row. If one is missing here, that is a
        # genuine bug (schema drift, artefact/app out of sync), not an
        # expected gap, so this fails loudly rather than guessing a price.
        psf_row <- housing_projection_matrix %>%
          filter(town == current_town, flat_type == current_ft,
                 remaining_lease_yrs == input$remaining_lease,
                 path == "Resale Purchase")
        
        if (nrow(psf_row) != 1) {
          stop("Parity gate violation: expected exactly 1 resale row for ",
               current_town, " / ", current_ft, " / ", input$remaining_lease,
               "y, found ", nrow(psf_row), ". Check housing_projection_matrix ",
               "is current and LEASE_GRID matches the artefact.")
        }
        
        psf_val        <- psf_row$predicted_start_psf
        floor_area_sqf <- psf_row$floor_area_sqf
        growth_rate    <- psf_row$central_growth_annual
        low_confidence <- psf_row$low_confidence
        cluster_label  <- psf_row$cluster_label
        
        calculated_resale_price <- psf_val * floor_area_sqf
        
        # B. RUN PATHWAY 1: OWNERSHIP (RESALE)
        # Single call to the shared compute_equity() — replaces the inline
        # downpayment/loan/monthly_payment/balance/value/equity block that
        # previously duplicated financial_rules.R's logic here.
        eq_resale <- compute_equity(
          price          = calculated_resale_price,
          annual_rate    = interest_rate,
          growth         = growth_rate,
          cash_injection = input$cash_injection,
          ltv            = rules$ltv,
          loan_years     = rules$loan_years,
          horizon_years  = h
        )
        
        pmt_resale    <- eq_resale$monthly_payment
        resale_equity <- eq_resale$equity_5y
        
        msr_tdsr_resale <- check_msr_tdsr(
          gross_monthly_income  = input$gross_monthly_income,
          existing_monthly_debt = input$existing_monthly_debt,
          loan_amount           = eq_resale$loan,
          loan_years            = rules$loan_years,
          quoted_rate           = interest_rate
        )
        
        # C. RUN PATHWAY 2: OWNERSHIP (BTO)
        # Two independent reasons BTO can be unavailable, kept as separate
        # flags rather than collapsed into one, since they mean different
        # things to the user:
        #  - scheme_ineligible: flat type isn't 2-Room (Singles Scheme rule)
        #  - bto_data_unavailable: town has no BTO history at all (13 of 25
        #    towns — a real, documented fact per Part 1.2, not a data bug)
        bto_scheme_ineligible <- !(current_ft %in% SINGLES_BTO_FLAT_TYPES)
        
        bto_row <- if (bto_scheme_ineligible) {
          tibble()
        } else {
          housing_projection_matrix %>%
            filter(town == current_town, flat_type == "2_ROOM", path == "BTO Purchase")
        }
        bto_data_unavailable <- !bto_scheme_ineligible && nrow(bto_row) == 0
        
        if (bto_scheme_ineligible || bto_data_unavailable) {
          bto_price_start    <- NA_real_
          bto_growth_rate    <- NA_real_
          pmt_bto            <- NA_real_
          bto_equity         <- NA_real_
          bto_low_confidence <- FALSE
          msr_tdsr_bto       <- list(regulatory_fail = FALSE)  # not applicable
        } else {
          bto_price_start    <- bto_row$predicted_start_psf * bto_row$floor_area_sqf
          bto_growth_rate    <- bto_row$central_growth_annual
          bto_low_confidence <- bto_row$low_confidence  # flags stale (>2y old) launch price
          
          eq_bto <- compute_equity(
            price          = bto_price_start,
            annual_rate    = interest_rate,
            growth         = bto_growth_rate,
            cash_injection = input$cash_injection,
            ltv            = rules$ltv,
            loan_years     = rules$loan_years,
            horizon_years  = h
          )
          
          pmt_bto    <- eq_bto$monthly_payment
          bto_equity <- eq_bto$equity_5y
          
          msr_tdsr_bto <- check_msr_tdsr(
            gross_monthly_income  = input$gross_monthly_income,
            existing_monthly_debt = input$existing_monthly_debt,
            loan_amount           = eq_bto$loan,
            loan_years            = rules$loan_years,
            quoted_rate           = interest_rate
          )
        }
        
        # D. RUN PATHWAY 3: RENTAL
        rent_total <- 0
        for (yr in 1:h) {
          rent_total <- rent_total + (input$base_rent * 12) * (1 + rent_growth_annual)^(yr - 1)
        }
        
        tibble(
          town                 = rep(current_town, 3),
          flat_type            = rep(current_ft, 3),
          cluster_label        = rep(cluster_label, 3),
          label                = paste0(current_town, " [", cluster_label, "] (", current_ft, ")"),
          path                 = c("BTO Purchase", "Resale Purchase", "Renting"),
          net_worth_5y         = c(bto_equity, resale_equity, -rent_total),
          monthly_housing      = c(pmt_bto, pmt_resale, input$base_rent),
          initial_price        = c(bto_price_start, calculated_resale_price, NA_real_),
          growth_rate          = c(bto_growth_rate, growth_rate, 0),
          regulatory_fail      = c(msr_tdsr_bto$regulatory_fail, msr_tdsr_resale$regulatory_fail, FALSE),
          scheme_ineligible    = c(bto_scheme_ineligible, FALSE, FALSE),
          bto_data_unavailable = c(bto_data_unavailable, FALSE, FALSE),
          low_confidence       = c(bto_low_confidence, low_confidence, FALSE)
        )
      }) %>%
      ungroup()
    
    simulation_output <- simulation_output %>%
      mutate(
        budget_violator = monthly_housing > input$monthly_budget,
        display_name = case_when(
          bto_data_unavailable               ~ paste(label, "\U0001F4ED No BTO history for this town"),
          regulatory_fail & budget_violator ~ paste(label, "\u26a0\ufe0f Over budget & fails MSR/TDSR"),
          regulatory_fail                   ~ paste(label, "\U0001F6AB Fails MSR/TDSR"),
          budget_violator                   ~ paste(label, "\u26a0\ufe0f Unaffordable"),
          low_confidence                     ~ paste(label, "\u2139\ufe0f Limited data \u2014 treat with caution"),
          TRUE                               ~ label
        )
      )
    
    # If a selected flat type isn't 2-Room, the BTO row for it is dropped
    # entirely rather than shown as "not eligible" — the Singles Scheme
    # restriction only needs stating when the user actually asked about
    # 2-Room and a specific town has no launch history (bto_data_unavailable,
    # kept below), not for every flat type they never selected in the first
    # place.
    simulation_output <- simulation_output %>%
      filter(!scheme_ineligible)
    
    return(simulation_output)
  })
  
  output$networth_plot <- renderPlot({
    # scheme_ineligible rows are already excluded upstream in results_data().
    # bto_data_unavailable rows (2-Room selected, but this town has no BTO
    # history) are still excluded here — a bar chart has no honest way to
    # draw "this option doesn't exist"; the table below shows that case
    # with an explicit status instead.
    df <- results_data() %>% filter(!bto_data_unavailable)
    
    ggplot(df, aes(x = display_name, y = net_worth_5y, fill = path)) +
      geom_col(position = position_dodge(width = 0.8), width = 0.7) +
      scale_fill_manual(values = c("BTO Purchase" = "#2ecc71", "Resale Purchase" = "#3498db", "Renting" = "#e74c3c")) +
      scale_y_continuous(labels = scales::dollar_format(prefix = "$")) +
      labs(
        x        = "Housing Alternative Matrix Rows",
        y        = "Projected 5-Year Net Worth Accumulation",
        title    = "Cross-Comparison Simulation Grid Output",
        fill     = "Strategic Strategy Path"
      ) +
      theme_minimal(base_size = 13) +
      theme(
        axis.text.x = element_text(angle = 35, hjust = 1, face = "bold"),
        legend.position = "top"
      )
  })
  
  output$summary_table <- renderTable({
    results_data() %>%
      mutate(
        unavailable = scheme_ineligible | bto_data_unavailable,
        `Configuration Label`  = display_name,
        `Pathway Option`       = path,
        `Monthly Payment`      = if_else(unavailable, "\u2014", scales::dollar(monthly_housing)),
        `Initial Asset Price`  = if_else(unavailable | is.na(initial_price), "\u2014", scales::dollar(initial_price)),
        `Growth Path Vector`   = if_else(unavailable | path == "Renting", "\u2014", scales::percent(growth_rate, accuracy = 0.01)),
        `Projected Net Worth`  = if_else(unavailable, "\u2014", scales::dollar(net_worth_5y)),
        `Lending Eligible?`    = case_when(
          scheme_ineligible    ~ "Not applicable (Singles Scheme: 2-Room only)",
          bto_data_unavailable ~ "Not applicable (no BTO history this town)",
          path == "Renting"    ~ "\u2014",
          regulatory_fail      ~ "No (MSR/TDSR)",
          TRUE                 ~ "Yes"
        ),
        `Data Confidence`      = case_when(
          unavailable        ~ "\u2014",
          path == "Renting"  ~ "\u2014",
          low_confidence     ~ "Limited (thin/stale supporting data)",
          TRUE               ~ "Good"
        )
      ) %>%
      select(`Configuration Label`, `Pathway Option`, `Monthly Payment`, `Initial Asset Price`,
             `Growth Path Vector`, `Projected Net Worth`, `Lending Eligible?`, `Data Confidence`)
  }, align = "c")
  
  output$recommendation_text <- renderText({
    df <- results_data() %>%
      filter(!budget_violator, !regulatory_fail, !scheme_ineligible, !bto_data_unavailable)
    
    if (nrow(df) == 0) {
      any_budget_ok <- results_data() %>%
        filter(!budget_violator, !scheme_ineligible, !bto_data_unavailable)
      if (nrow(any_budget_ok) > 0) {
        return("CRITICAL WARNING STRATEGY GATEWAY: Configurations exist within your comfortable monthly budget, but ALL of them fail the MAS MSR/TDSR lending eligibility check at your stated income. A bank or HDB would not approve these loans regardless of your personal comfort level. Consider a lower price point, longer tenure, or higher income input.")
      }
      return("CRITICAL WARNING STRATEGY GATEWAY: Every selected HDB ownership configuration choice crosses your active monthly payment comfort ceiling constraint slider, or has no available pathway to compare. Please expand your threshold criteria or adjust your selections.")
    }
    
    winner <- df %>% arrange(desc(net_worth_5y)) %>% slice(1)
    
    paste0("Within your stated monthly cost budget envelope of ",
           scales::dollar(input$monthly_budget), " and passing MAS lending eligibility (MSR/TDSR) at your stated income, the strategy maximizing capital generation over 5 years is the ",
           toupper(winner$path), " pathway tracking a ", winner$flat_type, " configuration inside ", winner$town,
           ". This delivers a 5-year equity footprint outcome of ", scales::dollar(winner$net_worth_5y),
           ". Configurations that break your comfortable cash flow bounds, fail the MSR/TDSR lending check, or have no available pathway have been automatically flagged with warning markers.")
  })
}



shinyApp(ui = ui, server = server)