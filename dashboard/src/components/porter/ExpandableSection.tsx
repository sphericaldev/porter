import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  isInitiallyExpanded?: boolean;
  Header: any;
  ExpandedSection: any;
  color?: any;
};

const ExpandableSection: React.FC<Props> = ({
  isInitiallyExpanded,
  Header,
  ExpandedSection,
  color,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    setIsExpanded(isInitiallyExpanded);
  }, [isInitiallyExpanded]);

  return (
    <StyledExpandableSection isExpanded={isExpanded}>
      <HeaderRow 
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        color={color}
      >
        <i className="material-icons">arrow_drop_down</i> 
        {Header}
      </HeaderRow>
      {
        isExpanded && (
          ExpandedSection
        )
      }
    </StyledExpandableSection>
  );
};

export default ExpandableSection;

const HeaderRow = styled.div<{ 
  isExpanded: boolean;
  color?: string;
}>`
  display: flex;
  align-items: center;
  height: 40px;
  font-size: 13px;
  width: 100%;
  margin-top: -1px;
  padding-left: 10px;
  cursor: pointer;
  :hover {
    background: ${props => props.isExpanded && "#ffffff18"};
  }

  > i {
    margin-right: 8px;
    color: ${props => props.color || "#ffffff66"};
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${props => props.isExpanded ? "" : "rotate(-90deg)"};
  }
`;

const StyledExpandableSection = styled.div<{ isExpanded: boolean }>`
  width: 100%;
  height: ${props => props.isExpanded ? "" : "40px"};
  max-height: 255px;
  overflow: hidden;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
  animation: ${props => props.isExpanded ? "expandRevisions 0.3s" : ""};
  animation-timing-function: ease-out;
  @keyframes expandRevisions {
    from {
      max-height: 40px;
    }
    to {
      max-height: 250px;
    }
  }
`;