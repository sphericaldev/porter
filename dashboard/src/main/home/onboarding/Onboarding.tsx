import React, { useContext, useEffect } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";
import { OnboardingState } from "./OnboardingState";
import Routes from "./Routes";

const Onboarding = () => {
  const context = useContext(Context);

  useEffect(() => {
    OnboardingState.actions.initFromGlobalContext(context);
  }, [context]);

  useEffect(() => {
    return () => {
      OnboardingState.actions.clearState();
    };
  }, []);
  return (
    <StyledOnboarding>
      <Routes />
    </StyledOnboarding>
  );
};

export default Onboarding;

const StyledOnboarding = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  position: relative;
  margin-top: calc(50vh - 340px);
`;
